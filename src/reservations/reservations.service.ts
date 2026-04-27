import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThan } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { AppSetting } from '../app_settings.entity';
import { User, UserRole } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { createClient } from '@supabase/supabase-js';
import { extname } from 'path';

export enum ReservationType {
    STANDARD = 'standard',
    TEACHER_BLOCK = 'teacher_block',
    TOURNAMENT = 'tournament',
    MAINTENANCE = 'maintenance'
}

@Injectable()
export class ReservationsService {
    constructor(
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,
        @InjectRepository(AppSetting)
        private appSettingRepository: Repository<AppSetting>,
        private eventsGateway: EventsGateway,
        private notificationsService: NotificationsService,
        private pricingService: PricingService,
    ) { }

    private getSupabaseClient() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (!url || !key) {
            throw new Error('Supabase URL or Key not configured in backend');
        }
        return createClient(url, key);
    }

    async findAll(requestingUser: any, date?: string) {
        let whereCondition = {};
        console.log('--- DATA ISOLATION CHECK ---');
        console.log('User requesting:', requestingUser?.id, 'Role:', requestingUser?.role);
        if (date) {
            const startDate = new Date(date + 'T00:00:00');
            const endDate = new Date(date + 'T23:59:59.999');
            whereCondition = {
                start_time: Between(startDate, endDate)
            };
        }

        const reservations = await this.reservationRepository.find({
            where: whereCondition,
            relations: ['user', 'court', 'payment', 'created_by'],
            order: { start_time: 'ASC' }
        });

        // Aplicar aislamiento de datos para jugadores
        const isAdmin = [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR].includes(requestingUser.role);
        
        if (isAdmin) {
            return reservations;
        }

        // Si es PLAYER, anonimizamos datos de terceros
        return reservations.map(res => {
            const isOwner = res.user?.id === requestingUser.id || res.created_by?.id === requestingUser.id;
            
            if (isOwner) {
                return res; // Ve todo su detalle
            }

            // Es de otro jugador: anonimizamos
            return {
                ...res,
                user: { name: 'Ocupado', id: 'HIDDEN' },
                created_by: { name: 'Ocupado', id: 'HIDDEN' },
                payment: null, // No ver pagos ajenos
            };
        });
    }

    async findOne(id: string): Promise<Reservation> {
        const reservation = await this.reservationRepository.findOne({ where: { id } });
        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
        }
        return reservation;
    }

    async getActiveReservationsCount(userId: string): Promise<number> {
        const now = new Date();
        return this.reservationRepository.count({
            where: {
                user: { id: userId },
                status: In([
                    ReservationStatus.RESERVED_PENDING_PAYMENT,
                    ReservationStatus.PAYMENT_UNDER_REVIEW,
                    ReservationStatus.APPROVED
                ]),
                end_time: MoreThan(now)
            },
        });
    }

    async createReservation(
        userId: string,
        courtId: number,
        startTime: Date,
        endTime: Date,
        createdByUserId?: string,
        addons: { itemId: string; quantity: number }[] = [],
        autoPay: boolean = false,
        reservationType: ReservationType = ReservationType.STANDARD
    ): Promise<Reservation> {
        // Enforce fixed hour blocks (00 minutes)
        const start = new Date(startTime);
        const end = new Date(endTime);
        const isMaintenance = reservationType === ReservationType.MAINTENANCE;

        // Prevent reservations in the past (only for players, admins might want to record past events)
        const user = await this.appSettingRepository.manager.findOne(User, { where: { id: createdByUserId || userId } });
        const isAdmin = user && [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR].includes(user.role as UserRole);

        const now = new Date();
        if (!isAdmin && !isMaintenance && start < now) {
            throw new BadRequestException('No se pueden realizar reservas para una fecha u hora que ya ha pasado.');
        }

        if (start.getMinutes() !== 0 || start.getSeconds() !== 0) {
            throw new BadRequestException('Las reservas deben iniciar exactamente en la hora en punto (ej: 05:00).');
        }

        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        if (durationMinutes !== 60) {
            throw new BadRequestException('Las reservas deben ser de exactamente 1 hora.');
        }

        let limitSetting = await this.appSettingRepository.findOne({ where: { key: 'max_concurrent_reservations' } });
        const maxReservations = limitSetting ? parseInt(limitSetting.value) : 2;

        // Check for overlaps on the same court and time
        const overlapping = await this.reservationRepository.findOne({
            where: {
                court: { id: courtId },
                status: In([
                    ReservationStatus.RESERVED_PENDING_PAYMENT,
                    ReservationStatus.PAYMENT_UNDER_REVIEW,
                    ReservationStatus.APPROVED
                ]),
                start_time: start,
            },
        });

        if (overlapping) {
            throw new BadRequestException('Esta cancha ya está reservada para este horario.');
        }

        const activeReservationsCount = await this.getActiveReservationsCount(userId);

        if (!isAdmin && !isMaintenance && activeReservationsCount >= maxReservations) {
            throw new BadRequestException(`Límite excedido: solo puedes tener ${maxReservations} reservas activas.`);
        }

        const creatorId = createdByUserId || userId;
        const finalUserId = (isMaintenance && !userId) ? creatorId : userId;

        if (!finalUserId) {
            throw new BadRequestException('Se requiere un usuario o administrador para realizar esta acción.');
        }

        // Calculate pricing for addons if present
        let savedAddons = [];
        if (!isMaintenance && addons && addons.length > 0) {
            for (const addon of addons) {
                const item = await this.paymentRepository.manager.findOne('Item', { where: { id: addon.itemId } });
                if (item) {
                    savedAddons.push({
                        itemId: addon.itemId,
                        name: (item as any).name,
                        price: (item as any).base_price,
                        quantity: addon.quantity
                    });
                }
            }
        }

        const newReservationData: any = {
            user: { id: finalUserId } as User,
            created_by: { id: creatorId } as User,
            court: { id: courtId } as Court,
            start_time: startTime,
            end_time: endTime,
            status: isMaintenance || autoPay ? ReservationStatus.APPROVED : ReservationStatus.RESERVED_PENDING_PAYMENT,
            type: reservationType,
            addons: savedAddons.length > 0 ? savedAddons : undefined
        };

        const newReservation = this.reservationRepository.create(newReservationData as Reservation);
        const savedReservation = await this.reservationRepository.save(newReservation) as Reservation;

        // If autoPay is requested (Admin only) and NOT maintenance, create an approved payment immediately
        if (autoPay && isAdmin && !isMaintenance) {
            const dateStr = start.toISOString().split('T')[0];
            const startTimeStr = start.toISOString().split('T')[1].substring(0, 5);
            const endTimeStr = end.toISOString().split('T')[1].substring(0, 5);

            const budget = await this.pricingService.calculateBudget({
                userId,
                courtId,
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                addons: addons || []
            });

            const payment = this.paymentRepository.create({
                reservation: savedReservation,
                amount: budget.financialSummary.grandTotal,
                payment_method: PaymentMethod.CASH,
                status: PaymentStatus.APPROVED,
                receipt_media_url: 'ADMIN_DIRECT_PAYMENT'
            });
            await this.paymentRepository.save(payment);
            
            // Broadcast the approval for calendar updates
            if (this.eventsGateway) {
                this.eventsGateway.broadcastReservationApproved(savedReservation.id, String(courtId));
            }
        }

        return savedReservation;
    }

    async uploadPaymentProof(reservationId: string, file: Express.Multer.File, uploaderRole: string = 'player', uploaderName: string = 'Jugador'): Promise<Reservation> {
        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: ['user', 'court']
        });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');

        // Subir a Supabase Storage
        const supabase = this.getSupabaseClient();
        const fileExt = extname(file.originalname);
        const fileName = `${reservationId}_${Date.now()}${fileExt}`;
        const filePath = `${fileName}`; 

        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading to Supabase:', uploadError);
            throw new BadRequestException('Error al subir el comprobante a la nube');
        }

        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);

        // Calcular monto real usando PricingService
        const dateStr = reservation.start_time.toISOString().split('T')[0];
        const startTimeStr = reservation.start_time.toISOString().split('T')[1].substring(0, 5);
        const endTimeStr = reservation.end_time.toISOString().split('T')[1].substring(0, 5);

        const budget = await this.pricingService.calculateBudget({
            userId: reservation.user.id,
            courtId: reservation.court.id,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            addons: [] 
        });

        const payment = this.paymentRepository.create({
            reservation: reservation,
            receipt_media_url: publicUrl,
            amount: budget.financialSummary.grandTotal,
            payment_method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING
        });
        await this.paymentRepository.save(payment);

        // Actualizar estado de la reserva
        reservation.status = ReservationStatus.PAYMENT_UNDER_REVIEW;

        const saved = await this.reservationRepository.save(reservation);

        // Notificar al admin en tiempo real
        this.eventsGateway.broadcastPaymentUploaded(reservationId, uploaderRole, uploaderName);

        return saved;
    }

    async approvePayment(reservationId: string): Promise<Reservation> {
        const reservation = await this.reservationRepository.findOne({ where: { id: reservationId }, relations: ['payment', 'court', 'user'] });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');

        if (reservation.payment) {
            reservation.payment.status = PaymentStatus.APPROVED;
            await this.paymentRepository.save(reservation.payment);
        }

        reservation.status = ReservationStatus.APPROVED;
        const saved = await this.reservationRepository.save(reservation);

        // Notificar al jugador y actualizar calendario
        this.eventsGateway.broadcastReservationApproved(reservationId, String(reservation.court.id));

        // Enviar email de aprobación
        if (reservation.user) {
            const dateStr = reservation.start_time ? new Date(reservation.start_time).toLocaleString('es-CO') : 'Fecha no disponible';
            this.notificationsService.sendApprovalEmail(
                reservation.user.email || 'sin-email@ejemplo.com',
                reservation.user.name || 'Jugador',
                reservation.court?.name || 'Cancha',
                dateStr
            );
        }

        return saved;
    }

    async rejectPayment(reservationId: string): Promise<Reservation> {
        const reservation = await this.reservationRepository.findOne({ where: { id: reservationId }, relations: ['payment', 'court', 'user'] });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');

        if (reservation.payment) {
            reservation.payment.status = PaymentStatus.REJECTED;
            await this.paymentRepository.save(reservation.payment);
        }

        reservation.status = ReservationStatus.REJECTED;
        const saved = await this.reservationRepository.save(reservation);

        // Notificar rechazo via WebSocket
        this.eventsGateway.broadcastReservationRejected(reservationId);

        // Enviar email de rechazo
        if (reservation.user) {
            const dateStr = reservation.start_time ? new Date(reservation.start_time).toLocaleString('es-CO') : 'Fecha no disponible';
            this.notificationsService.sendRejectionEmail(
                reservation.user.email || 'sin-email@ejemplo.com',
                reservation.user.name || 'Jugador',
                reservation.court?.name || 'Cancha',
                dateStr
            );
        }

        return saved;
    }

    private serverNotifyUpdate() {
        // Notificación genérica para forzar recarga en clientes
        this.eventsGateway.server.emit('force_refresh', { message: 'Actualización de estado detectada' });
    }

    async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
        const reservation = await this.findOne(id);
        reservation.status = status;
        return this.reservationRepository.save(reservation);
    }

    async delete(id: string): Promise<void> {
        const reservation = await this.findOne(id);
        await this.reservationRepository.remove(reservation);
    }

    async getDashboardSummary() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const todayReservationsCount = await this.reservationRepository.count({
            where: {
                start_time: Between(startOfDay, endOfDay),
                status: In([ReservationStatus.APPROVED, ReservationStatus.PAYMENT_UNDER_REVIEW, ReservationStatus.RESERVED_PENDING_PAYMENT])
            }
        });

        const pendingPaymentsCount = await this.reservationRepository.count({
            where: {
                status: In([ReservationStatus.PAYMENT_UNDER_REVIEW, ReservationStatus.RESERVED_PENDING_PAYMENT])
            }
        });

        const activeUsersCount = await this.reservationRepository.manager.count(User);

        return {
            todayReservationsCount,
            pendingPaymentsCount,
            activeUsersCount
        };
    }

    async cancelReservation(reservationId: string, userId: string): Promise<{ message: string }> {
        const reservation = await this.reservationRepository.findOne({
            where: { id: reservationId },
            relations: ['user']
        });

        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }

        const user = await this.appSettingRepository.manager.findOne(User, { where: { id: userId } });
        const isStaff = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.OPERATOR);

        // Si no es staff, validar pertenencia y política
        if (!isStaff) {
            if (reservation.user.id !== userId) {
                throw new BadRequestException('No tienes permiso para cancelar esta reserva');
            }

            // Validar política de tiempo
            const policySetting = await this.appSettingRepository.findOne({ where: { key: 'min_cancel_hours_reservation' } });
            const minHours = policySetting ? parseInt(policySetting.value) : 0;

            if (minHours > 0) {
                const now = new Date();
                const limitDate = new Date(reservation.start_time);
                limitDate.setHours(limitDate.getHours() - minHours);

                if (now > limitDate) {
                    throw new BadRequestException(`No puedes cancelar con menos de ${minHours} horas de anticipación.`);
                }
            }

            // Validación de estado (solo si no es staff)
            if (reservation.status !== ReservationStatus.RESERVED_PENDING_PAYMENT) {
                throw new BadRequestException('Solo puedes cancelar reservas que están pendientes de pago.');
            }
        }

        await this.reservationRepository.remove(reservation);

        // Notificar globalmente para actualizar el calendario
        if (this.eventsGateway && this.eventsGateway.server) {
            this.eventsGateway.server.emit('force_refresh', { message: 'Reserva cancelada' });
        }

        return { message: 'Reserva cancelada exitosamente' };
    }
}
