import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamePlan } from './game-plan.entity';
import { JuguemosService } from './juguemos.service';
import { JuguemosController } from './juguemos.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { CourtsModule } from '../courts/courts.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([GamePlan]),
        ReservationsModule,
        NotificationsModule,
        EventsModule,
        CourtsModule,
        UsersModule,
    ],
    providers: [JuguemosService],
    controllers: [JuguemosController],
    exports: [JuguemosService],
})
export class JuguemosModule { }
