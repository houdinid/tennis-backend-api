import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyClass } from './academy-class.entity';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { AppSetting } from '../app_settings.entity';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AcademyClass, AppSetting]),
        ReservationsModule,
        UsersModule,
        EventsModule,
        NotificationsModule,
    ],
    providers: [AcademyService],
    controllers: [AcademyController],
    exports: [AcademyService],
})
export class AcademyModule { }
