import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { Court } from './court.entity';
import { Item } from '../pricing/item.entity';
import { ItemCategory } from '../pricing/item-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, Item, ItemCategory])],
  providers: [CourtsService],
  controllers: [CourtsController],
  exports: [CourtsService],
})
export class CourtsModule { }
