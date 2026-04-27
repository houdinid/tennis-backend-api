import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { User } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { Reservation } from '../reservations/reservation.entity';
import { AcademyClass } from '../academy/academy-class.entity';
import { AppSetting } from '../app_settings.entity';
import { Payment } from '../reservations/payment.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Court, Reservation, AcademyClass, AppSetting, Payment])
    ],
    providers: [BackupService],
    controllers: [BackupController]
})
export class BackupModule {}
