import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AcademyClass } from '../academy/academy-class.entity';
import { AppSetting } from '../app_settings.entity';
import { Payment } from '../reservations/payment.entity';

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    constructor(
        private dataSource: DataSource,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Court) private courtRepository: Repository<Court>,
        @InjectRepository(Reservation) private reservationRepository: Repository<Reservation>,
        @InjectRepository(AcademyClass) private academyRepository: Repository<AcademyClass>,
        @InjectRepository(AppSetting) private settingsRepository: Repository<AppSetting>,
        @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    ) { }

    async exportData() {
        this.logger.log('Starting data export...');
        const data = {
            users: await this.userRepository.find(),
            courts: await this.courtRepository.find(),
            reservations: await this.reservationRepository.find(),
            academyClasses: await this.academyRepository.find(),
            settings: await this.settingsRepository.find(),
            payments: await this.paymentRepository.find(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        this.logger.log('Data export completed.');
        return data;
    }

    async importData(data: any) {
        this.logger.log('Starting data restoration...');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Disable foreign key checks if possible or delete in order
            // Note: In TypeORM/Postgres, we usually delete in reverse dependency order
            
            await queryRunner.manager.delete(Payment, {});
            await queryRunner.manager.delete(AcademyClass, {});
            await queryRunner.manager.delete(Reservation, {});
            await queryRunner.manager.delete(Court, {});
            await queryRunner.manager.delete(AppSetting, {});
            await queryRunner.manager.delete(User, {});

            // Re-insert data
            if (data.users) await queryRunner.manager.save(User, data.users);
            if (data.settings) await queryRunner.manager.save(AppSetting, data.settings);
            if (data.courts) await queryRunner.manager.save(Court, data.courts);
            if (data.reservations) await queryRunner.manager.save(Reservation, data.reservations);
            if (data.academyClasses) await queryRunner.manager.save(AcademyClass, data.academyClasses);
            if (data.payments) await queryRunner.manager.save(Payment, data.payments);

            await queryRunner.commitTransaction();
            this.logger.log('Data restoration successful.');
            return { success: true, message: 'Base de datos restaurada correctamente.' };
        } catch (err) {
            this.logger.error('Error during restoration:', err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
