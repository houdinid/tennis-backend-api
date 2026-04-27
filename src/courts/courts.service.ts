import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Court, CourtStatus, CourtSurface } from './court.entity';
import { Item } from '../pricing/item.entity';
import { ItemCategory } from '../pricing/item-category.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CourtsService implements OnModuleInit {
    constructor(
        @InjectRepository(Court)
        private courtRepository: Repository<Court>,
        @InjectRepository(Item) private itemRepo: Repository<Item>,
        @InjectRepository(ItemCategory) private categoryRepo: Repository<ItemCategory>,
        private eventsGateway: EventsGateway,
    ) { }

    async onModuleInit() {
        try {
            await this.courtRepository.query('ALTER TABLE courts ADD COLUMN IF NOT EXISTS description CHARACTER VARYING(500);');
            await this.itemRepo.query('ALTER TABLE item ADD COLUMN IF NOT EXISTS court_id INTEGER;');

            // Vincular items existentes que no tengan court_id sumando el nombre
            await this.itemRepo.query(`
                UPDATE item i
                SET court_id = c.id
                FROM courts c
                WHERE i.court_id IS NULL AND i.name = 'Alquiler ' || c.name;
            `);

            console.log('✅ Base de datos actualizada: Columnas y vínculos de canchas verificados.');
        } catch (e) {
            console.error('❌ Error al actualizar esquema:', e.message);
        }
    }

    async findAll(): Promise<any[]> {
        const courts = await this.courtRepository.find({ order: { id: 'ASC' } });
        const items = await this.itemRepo.find({ where: { category: { name: 'Cancha' } }, relations: ['category'] });

        return courts.map(c => {
            // Buscamos el item por su vínculo directo court_id
            const item = items.find(i => i.court_id === c.id);
            return {
                ...c,
                base_price: item ? item.base_price : 0,
                item_id: item ? item.id : null
            };
        });
    }

    async create(name: string, description: string, surface_type: CourtSurface = CourtSurface.CLAY, base_price: number = 30000): Promise<Court> {
        const existing = await this.courtRepository.findOne({ where: { name } });
        if (existing) {
            throw new BadRequestException(`Ya existe una cancha con el nombre "${name}".`);
        }

        const court = this.courtRepository.create({ name, description, surface_type, status: CourtStatus.ACTIVE });
        const savedCourt = await this.courtRepository.save(court);

        let courtCategory = await this.categoryRepo.findOne({ where: { name: 'Cancha' } });
        if (!courtCategory) courtCategory = await this.categoryRepo.save({ name: 'Cancha', is_reservable: true });

        await this.itemRepo.save({
            name: `Alquiler ${savedCourt.name}`,
            base_price: base_price,
            category_id: courtCategory.id,
            court_id: savedCourt.id // Vínculo directo
        });

        return savedCourt;
    }

    async update(id: number, name: string, description: string, status?: CourtStatus, base_price?: number): Promise<Court> {
        const court = await this.courtRepository.findOne({ where: { id } });
        if (!court) throw new NotFoundException(`Cancha #${id} no encontrada.`);

        if (name && name !== court.name) {
            const existing = await this.courtRepository.findOne({ where: { name } });
            if (existing) {
                throw new BadRequestException(`Ya existe una cancha con el nombre "${name}".`);
            }
        }

        court.name = name ?? court.name;
        court.description = description ?? court.description;
        if (status) court.status = status;

        if (base_price !== undefined || name) {
            const item = await this.itemRepo.findOne({ where: { court_id: id } });
            if (item) {
                if (base_price !== undefined) item.base_price = base_price;
                if (name) item.name = `Alquiler ${name}`;
                await this.itemRepo.save(item);
            }
        }

        const saved = await this.courtRepository.save(court);
        
        // Notificar a todos los clientes para refrescar el calendario
        if (this.eventsGateway && this.eventsGateway.server) {
            this.eventsGateway.server.emit('force_refresh', { message: 'Estado de cancha actualizado' });
        }

        return saved;
    }

    async remove(id: number): Promise<void> {
        const court = await this.courtRepository.findOne({ where: { id } });
        if (!court) throw new NotFoundException(`Cancha #${id} no encontrada.`);

        try {
            // 1. Borrar reservaciones asociadas a esta cancha
            await this.courtRepository.query('DELETE FROM reservations WHERE court_id = $1', [id]);

            // 2. Borrar el item de precio asociado por su ID exacto
            const item = await this.itemRepo.findOne({ where: { court_id: id } });
            if (item) {
                await this.itemRepo.delete(item.id);
            }

            // 3. Intentar borrar la cancha
            await this.courtRepository.delete(id);
        } catch (e) {
            throw new BadRequestException(`Error al eliminar: ${e.message}`);
        }
    }
}
