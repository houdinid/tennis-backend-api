import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyClass } from './academy-class.entity';
import { User, UserRole } from '../users/user.entity';
import { AppSetting } from '../app_settings.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { UsersService } from '../users/users.service';
import { ReservationStatus, ReservationType } from '../reservations/reservation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AcademyService {
    constructor(
        @InjectRepository(AcademyClass)
        private academyRepository: Repository<AcademyClass>,
        @InjectRepository(AppSetting)
        private appSettingRepository: Repository<AppSetting>,
        private reservationsService: ReservationsService,
        private usersService: UsersService,
        private notificationsService: NotificationsService,
        private eventsGateway: EventsGateway,
    ) { }

    async createClass(data: {
        title: string,
        description?: string,
        teacherId: string,
        courtId: number,
        startTime: string,
        endTime: string,
        capacity: number,
        price_per_person: number,
        level_required?: string,
        age_group?: string,
        topics_covered?: string,
        show_topics?: boolean
    }): Promise<AcademyClass> {
        const teacher = await this.usersService.findById(data.teacherId);
        if (!teacher) throw new NotFoundException('Profesor no encontrado');

        // Parse strings to Dates
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);

        // Create the reservation for the class
        const reservation = await this.reservationsService.createReservation(
            data.teacherId,
            data.courtId,
            start,
            end,
            data.teacherId
        );

        // Set reservation as approved immediately for academy classes
        reservation.status = ReservationStatus.APPROVED;
        reservation.type = ReservationType.TEACHER_BLOCK;
        await this.reservationsService.updateStatus(reservation.id, ReservationStatus.APPROVED);

        const academyClass = this.academyRepository.create({
            title: data.title,
            description: data.description,
            teacher,
            reservation,
            capacity: data.capacity,
            price_per_person: data.price_per_person,
            level_required: data.level_required,
            age_group: data.age_group,
            topics_covered: data.topics_covered,
            show_topics: data.show_topics || false,
            student_ids: []
        });

        const savedClass = await this.academyRepository.save(academyClass);

        // Notify in real time
        this.eventsGateway.broadcastAcademyClassCreated(savedClass);

        // Find matching users and notify them via simulated email
        try {
            const allUsers = await this.usersService.findAll();
            const matchingUsers = allUsers.filter(user => {
                // Must be opted in
                if (!user.opt_in_academy) return false;
                
                // If a level is required, check if user matches or if class is "Todos"
                if (savedClass.level_required && savedClass.level_required !== 'Todos') {
                    if (user.tennis_level !== savedClass.level_required) return false;
                }

                // If age group is required, calculate age and check
                if (savedClass.age_group && user.birthdate) {
                    const today = new Date();
                    const birthDate = new Date(user.birthdate);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }

                    // Map age groups roughly
                    // Kids: 4-12, Juniors: 13-17, Adults: 18-49, Seniors: 50+
                    if (savedClass.age_group === 'Kids' && (age < 4 || age > 12)) return false;
                    if (savedClass.age_group === 'Juniors' && (age < 13 || age > 17)) return false;
                    if (savedClass.age_group === 'Adults' && (age < 18 || age > 49)) return false;
                    if (savedClass.age_group === 'Seniors' && age < 50) return false;
                }

                return true;
            });

            for (const user of matchingUsers) {
                // Send email asynchronously without blocking class creation
                this.notificationsService.sendAcademyClassNotification(user, savedClass).catch(e => console.error(e));
            }
        } catch (e) {
            console.error('Error notifying users:', e);
        }

        return savedClass;
    }

    async findAll(includePast: boolean = false): Promise<any[]> {
        const now = new Date();
        const query = this.academyRepository.createQueryBuilder('ac')
            .leftJoinAndSelect('ac.teacher', 'teacher')
            .leftJoinAndSelect('ac.reservation', 'reservation')
            .leftJoinAndSelect('reservation.court', 'court');

        if (!includePast) {
            query.where('reservation.start_time > :now', { now });
        }

        const classes = await query.orderBy('reservation.start_time', 'ASC').getMany();

        const allUsers = await this.usersService.findAll();
        const userMap = new Map(allUsers.map(u => [u.id, { name: u.name, email: u.email }]));

        return classes.map(cls => ({
            ...cls,
            students: (cls.student_ids || []).map(id => userMap.get(id)).filter(u => !!u)
        }));
    }

    async joinClass(classId: string, userId: string): Promise<AcademyClass> {
        const academyClass = await this.academyRepository.findOne({ 
            where: { id: classId },
            relations: ['reservation']
        });
        if (!academyClass) throw new NotFoundException('Clase no encontrada');

        const now = new Date();
        if (academyClass.reservation && new Date(academyClass.reservation.start_time) <= now) {
            throw new BadRequestException('No puedes inscribirte en una clase que ya ha comenzado.');
        }

        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // Check reservation limits for players
        const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.OPERATOR;
        if (!isStaff) {
            const limitSetting = await this.appSettingRepository.findOne({ where: { key: 'max_concurrent_reservations' } });
            const maxReservations = limitSetting ? parseInt(limitSetting.value) : 2;
            const activeCount = await this.reservationsService.getActiveReservationsCount(userId);
            if (activeCount >= maxReservations) {
                throw new BadRequestException(`Límite de reservas excedido: solo puedes tener ${maxReservations} reservas activas.`);
            }
        }

        if (academyClass.student_ids && academyClass.student_ids.length >= academyClass.capacity) {
            throw new ConflictException('La clase está llena');
        }

        if (academyClass.student_ids && academyClass.student_ids.includes(userId)) {
            throw new ConflictException('Ya estás inscrito en esta clase');
        }

        if (!academyClass.student_ids) academyClass.student_ids = [];
        academyClass.student_ids.push(userId);

        return this.academyRepository.save(academyClass);
    }

    async deleteClass(id: string): Promise<void> {
        const academyClass = await this.academyRepository.findOne({ where: { id }, relations: ['reservation'] });
        if (!academyClass) throw new NotFoundException('Clase no encontrada');

        if (academyClass.reservation) {
            await this.reservationsService.delete(academyClass.reservation.id);
        }

        await this.academyRepository.delete(id);
    }

    async leaveClass(classId: string, userId: string): Promise<{ message: string }> {
        const academyClass = await this.academyRepository.findOne({ 
            where: { id: classId },
            relations: ['reservation']
        });
        if (!academyClass) throw new NotFoundException('Clase no encontrada');

        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.OPERATOR;

        if (!isStaff) {
            // Validar política de tiempo
            const policySetting = await this.academyRepository.manager.findOne(AppSetting, { where: { key: 'min_cancel_hours_academy' } });
            const minHours = policySetting ? parseInt(policySetting.value) : 0;

            if (minHours > 0 && academyClass.reservation) {
                const now = new Date();
                const limitDate = new Date(academyClass.reservation.start_time);
                limitDate.setHours(limitDate.getHours() - minHours);

                if (now > limitDate) {
                    throw new BadRequestException(`No puedes retirarte con menos de ${minHours} horas de anticipación.`);
                }
            }
        }

        if (academyClass.student_ids) {
            academyClass.student_ids = academyClass.student_ids.filter(id => id !== userId);
            await this.academyRepository.save(academyClass);
        }

        return { message: 'Te has retirado de la clase exitosamente.' };
    }
}
