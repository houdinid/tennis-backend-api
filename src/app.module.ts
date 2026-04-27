import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { CourtsModule } from './courts/courts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { User } from './users/user.entity';
import { Court } from './courts/court.entity';
import { Reservation } from './reservations/reservation.entity';
import { Payment } from './reservations/payment.entity';
import { AppSetting } from './app_settings.entity';
import { EventsModule } from './events/events.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PricingModule } from './pricing/pricing.module';
import { ItemCategory } from './pricing/item-category.entity';
import { Item } from './pricing/item.entity';
import { PricingRule } from './pricing/pricing-rule.entity';
import { ReservationOrder } from './pricing/reservation-order.entity';
import { OrderDetail } from './pricing/order-detail.entity';
import { JuguemosModule } from './juguemos/juguemos.module';
import { GamePlan } from './juguemos/game-plan.entity';
import { AcademyModule } from './academy/academy.module';
import { AcademyClass } from './academy/academy-class.entity';
import { BackupModule } from './backup/backup.module';
import { AuthModule } from './auth/auth.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE', 'tennis_pwa'),
                entities: [User, Court, Reservation, Payment, AppSetting, ItemCategory, Item, PricingRule, ReservationOrder, OrderDetail, GamePlan, AcademyClass],
                synchronize: false,
            }),
        }),
        EventsModule,
        UsersModule,
        CourtsModule,
        ReservationsModule,
        SettingsModule,
        NotificationsModule,
        PricingModule,
        JuguemosModule,
        AcademyModule,
        BackupModule,
        AuthModule
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
