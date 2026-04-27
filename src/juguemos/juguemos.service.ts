import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamePlan, GamePlanStatus } from './game-plan.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { User } from '../users/user.entity';
import { CourtsService } from '../courts/courts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class JuguemosService {
    private readonly logger = new Logger(JuguemosService.name);

    constructor(
        @InjectRepository(GamePlan)
        private gamePlanRepository: Repository<GamePlan>,
        private reservationsService: ReservationsService,
        private notificationsService: NotificationsService,
        private eventsGateway: EventsGateway,
        private courtsService: CourtsService,
        private usersService: UsersService,
    ) { }

    async findAllOpen(): Promise<GamePlan[]> {
        const plans = await this.gamePlanRepository.find({
            where: { status: GamePlanStatus.OPEN },
            relations: ['creator', 'court', 'opponent', 'reservation'],
            order: { date: 'ASC', startTime: 'ASC' },
        });

        const validPlans = [];
        const now = new Date();
        // Use local-relative ISO-like string for current date/time comparison
        const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' });

        for (const plan of plans) {
            // Comparación robusta
            const isPastDate = plan.date < dateStr;
            const isToday = plan.date === dateStr;
            const isPastHour = isToday && plan.startTime <= timeStr;

            if (isPastDate || isPastHour) {
                plan.status = GamePlanStatus.EXPIRED;
                await this.gamePlanRepository.save(plan);
            } else {
                validPlans.push(plan);
            }
        }
        return validPlans;
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleCron() {
        this.logger.log('Iniciando limpieza proactiva de planes expirados...');
        const now = new Date();
        const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' });

        // Buscamos planes OPEN que ya pasaron
        const expired = await this.gamePlanRepository.createQueryBuilder('gp')
            .where('gp.status = :status', { status: GamePlanStatus.OPEN })
            .andWhere('(gp.date < :date OR (gp.date = :date AND gp.startTime <= :time))', { date: dateStr, time: timeStr })
            .getMany();

        if (expired.length > 0) {
            for (const plan of expired) {
                plan.status = GamePlanStatus.EXPIRED;
            }
            await this.gamePlanRepository.save(expired);
            this.logger.log(`✅ ${expired.length} planes marcados como EXPIRADOS (Cron).`);
        }
    }

    async findAll(): Promise<GamePlan[]> {
        // Al acceder como admin, también disparamos una limpieza rápida "on-the-fly"
        const now = new Date();
        const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const openPast = await this.gamePlanRepository.createQueryBuilder('gp')
            .where('gp.status = :status', { status: GamePlanStatus.OPEN })
            .andWhere('(gp.date < :date OR (gp.date = :date AND gp.startTime <= :time))', { date: dateStr, time: timeStr })
            .getMany();

        if (openPast.length > 0) {
            for (const p of openPast) p.status = GamePlanStatus.EXPIRED;
            await this.gamePlanRepository.save(openPast);
        }

        return this.gamePlanRepository.find({
            relations: ['creator', 'court', 'opponent', 'reservation'],
            order: { date: 'DESC', startTime: 'DESC' },
        });
    }

    async createGamePlan(userId: string, data: any) {
        const gamePlan = this.gamePlanRepository.create({
            creator: { id: userId } as User,
            court: { id: data.courtId },
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            levelRequired: data.levelRequired,
            description: data.description,
            status: GamePlanStatus.OPEN
        });
        return this.gamePlanRepository.save(gamePlan);
    }

    async joinGamePlan(planId: string, opponentId: string) {
        const plan = await this.gamePlanRepository.findOne({
            where: { id: planId },
            relations: ['creator', 'court']
        });

        if (!plan) throw new NotFoundException('Plan de juego no encontrado');
        if (plan.status !== GamePlanStatus.OPEN) throw new BadRequestException('Este plan ya no está disponible');
        if (plan.creator.id === opponentId) throw new BadRequestException('No puedes unirte a tu propio plan');

        // Validar si el plan ya venció antes de permitir unirse (Smart Matching)
        const now = new Date();
        const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const isPastDate = plan.date < dateStr;
        const isToday = plan.date === dateStr;
        const isPastHour = isToday && plan.startTime <= timeStr;

        if (isPastDate || isPastHour) {
            plan.status = GamePlanStatus.EXPIRED;
            await this.gamePlanRepository.save(plan);
            throw new BadRequestException('Este plan ya expiró y no es posible unirse.');
        }

        const startDateTime = new Date(`${plan.date}T${plan.startTime}:00`);
        const endDateTime = new Date(`${plan.date}T${plan.endTime}:00`);

        let reservation: any;
        let finalCourt = plan.court;
        let isFallback = false;

        try {
            // Intento 1: Reservar la cancha original
            reservation = await this.reservationsService.createReservation(
                plan.creator.id, 
                plan.court.id,
                startDateTime,
                endDateTime,
                opponentId
            );
        } catch (error) {
            // Si la cancha original fue ocupada, intentamos con alguna otra.
            this.logger.warn(`Cancha original #${plan.court.id} ocupada para ${plan.date} ${plan.startTime}. Buscando recambio dinámico...`);
            const allCourts = await this.courtsService.findAll();
            let matchedFallback = false;
            let lastError = error.message;

            for (const fallbackCourt of allCourts) {
                if (fallbackCourt.id === plan.court.id || fallbackCourt.status !== 'active') continue;

                try {
                    this.logger.log(`Intentando recambio en cancha #${fallbackCourt.id} (${fallbackCourt.name})...`);
                    reservation = await this.reservationsService.createReservation(
                        plan.creator.id,
                        fallbackCourt.id,
                        startDateTime,
                        endDateTime,
                        opponentId
                    );
                    finalCourt = fallbackCourt;
                    isFallback = true;
                    matchedFallback = true;
                    this.logger.log(`✅ Recambio exitoso en ${fallbackCourt.name}`);
                    break; // Éxito con el recambio
                } catch (fallbackError) {
                    this.logger.error(`❌ Recambio falló en ${fallbackCourt.name}: ${fallbackError.message}`);
                    lastError = fallbackError.message;
                    // Seguimos intentando con la próxima cancha
                }
            }

            if (!matchedFallback) {
                // Si ninguna cancha estaba disponible o falló por otras reglas (ej. límites)
                plan.status = GamePlanStatus.EXPIRED;
                await this.gamePlanRepository.save(plan);
                
                const responseMsg = lastError.includes('Límite excedido') 
                    ? `Match fallido: El creador del plan ya tiene el máximo de reservas permitidas. El plan ha sido cancelado.`
                    : `El club ya no tiene canchas disponibles en ese horario. El plan ha sido cancelado.`;
                
                throw new BadRequestException(responseMsg);
            }
        }

        const opponent = await this.usersService.findById(opponentId);
        if (!opponent) throw new NotFoundException('Usuario oponente no encontrado');
        plan.opponent = opponent;
        plan.status = GamePlanStatus.MATCHED;
        plan.reservation = reservation;
        plan.isFallback = isFallback; // Persistimos que fue reubicado automáticamente

        plan.court = finalCourt; // Actualizamos a la cancha final en el plan
        const savedPlan = await this.gamePlanRepository.save(plan);

        let details = `${plan.date} a las ${plan.startTime} en ${finalCourt.name}`;
        if (isFallback) {
            details += ` (Cambiado automáticamente: Original ocupada)`;
        }

        // Properly send the email notification using full user objects
        this.notificationsService.sendMatchNotification(
            plan.creator,
            opponent,
            details
        );

        // WebSocket notification
        this.eventsGateway.server.emit('game_matched', {
            planId: plan.id,
            creatorId: plan.creator.id,
            opponentId: opponentId,
            details: details
        });

        return {
            plan: savedPlan,
            courtChanged: isFallback,
            assignedCourtName: finalCourt.name
        };
    }

    async cancelGamePlan(planId: string, userId: string) {
        const plan = await this.gamePlanRepository.findOne({
            where: { id: planId },
            relations: ['creator']
        });

        if (!plan) throw new NotFoundException('Plan de juego no encontrado');

        // Allow admin or the creator to cancel
        if (userId !== 'admin' && plan.creator.id !== userId) {
            throw new BadRequestException('No tienes permiso para cancelar este plan');
        }

        plan.status = GamePlanStatus.CANCELLED;
        return this.gamePlanRepository.save(plan);
    }
}
