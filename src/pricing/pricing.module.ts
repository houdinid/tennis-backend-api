import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCategory } from './item-category.entity';
import { Item } from './item.entity';
import { PricingRule } from './pricing-rule.entity';
import { ReservationOrder } from './reservation-order.entity';
import { OrderDetail } from './order-detail.entity';
import { User } from '../users/user.entity';
import { AppSetting } from '../app_settings.entity';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { ItemsController } from './items.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([ItemCategory, Item, PricingRule, ReservationOrder, OrderDetail, User, AppSetting]),
    ],
    providers: [PricingService],
    controllers: [PricingController, ItemsController],
    exports: [PricingService]
})
export class PricingModule { }
