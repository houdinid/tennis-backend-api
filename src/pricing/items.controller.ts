import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './item.entity';
import { ItemCategory } from './item-category.entity';

@Controller('items')
export class ItemsController {
    constructor(
        @InjectRepository(Item) private itemRepo: Repository<Item>,
        @InjectRepository(ItemCategory) private categoryRepo: Repository<ItemCategory>,
    ) { }

    @Get()
    async findAll() {
        return this.itemRepo.find({ relations: ['category'] });
    }

    @Get('addons')
    async findAddons() {
        // Return everything that is not a court
        return this.itemRepo.createQueryBuilder('item')
            .leftJoinAndSelect('item.category', 'category')
            .where('category.name != :name', { name: 'Cancha' })
            .getMany();
    }

    @Post()
    async create(@Body() body: any) {
        let categoryName = body.category === 'beverage' ? 'Bebida' :
            (body.category === 'academy' ? 'Academia' : 'Add-on');

        let category = await this.categoryRepo.findOne({ where: { name: categoryName } });
        if (!category) {
            category = await this.categoryRepo.save({ name: categoryName, is_reservable: false });
        }

        return this.itemRepo.save({
            name: body.name,
            base_price: parseFloat(body.price),
            category_id: category.id
        });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.itemRepo.delete(id);
        return { success: true };
    }
}
