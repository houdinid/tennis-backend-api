import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategory } from './item-category.entity';
import { Item } from './item.entity';
import { PricingRule } from './pricing-rule.entity';
import { User } from '../users/user.entity';
import { AppSetting } from '../app_settings.entity';

@Injectable()
export class PricingService {
    constructor(
        @InjectRepository(ItemCategory) private categoryRepo: Repository<ItemCategory>,
        @InjectRepository(Item) private itemRepo: Repository<Item>,
        @InjectRepository(PricingRule) private ruleRepo: Repository<PricingRule>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(AppSetting) private appSettingRepo: Repository<AppSetting>,
    ) { }

    async calculateBudget(dto: any) {
        const { userId, courtId, date, startTime, endTime, addons } = dto;

        // Robust date parsing to avoid timezone shifts
        let start: Date, end: Date;
        try {
            // Support YYYY-MM-DD or DD/MM/YYYY
            const parts = date.includes('-') ? date.split('-') : date.split('/');
            let y: number, m: number, d: number;

            if (parts[0].length === 4) { // YYYY-MM-DD
                y = Number(parts[0]);
                m = Number(parts[1]);
                d = Number(parts[2]);
            } else { // DD/MM/YYYY or MM/DD/YYYY
                // Assuming DD/MM/YYYY if first part is <= 31 and second <= 12
                d = Number(parts[0]);
                m = Number(parts[1]);
                y = Number(parts[2]);
            }

            const [h1, min1] = startTime.split(':').map(Number);
            const [h2, min2] = endTime.split(':').map(Number);

            start = new Date(y, m - 1, d, h1, min1);
            end = new Date(y, m - 1, d, h2, min2);
        } catch (e) {
            console.error('Error parsing dates, falling back to literal constructor', e);
            start = new Date(`${date}T${startTime}`);
            end = new Date(`${date}T${endTime}`);
        }

        const durationHr = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const hours = Math.max(0, Math.ceil(durationHr));

        let user = null;
        if (userId && userId !== 'null' && typeof userId === 'string' && userId.length > 20) {
            try {
                user = await this.userRepo.findOne({ where: { id: userId } });
            } catch (e) {
                // Ignore invalid UUID or other errors in user lookup
            }
        }
        const dayOfWeek = (start.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        const startHour = start.getHours();

        const items = [];
        let subtotalBase = 0;
        let totalAfterRules = 0;

        const courtCategory = await this.categoryRepo.findOne({ where: { name: 'Cancha' } });
        if (courtCategory) {
            // Find specific item for this court
            let courtItem = await this.itemRepo.findOne({
                where: {
                    category_id: courtCategory.id,
                    court_id: courtId
                }
            });

            // Fallback to any item of category 'Cancha' if specific one not found
            if (!courtItem) {
                courtItem = await this.itemRepo.findOne({
                    where: { category_id: courtCategory.id }
                });
            }

            if (courtItem) {

                let itemSubtotal = 0;
                let baseSubtotal = 0;
                let gridPricingUsed = false;

                // NEW: Fetch directly from tables used by the new Admin Portal
                const gridData = await this.appSettingRepo.manager.query('SELECT * FROM pricing_grid');
                const tiersData = await this.appSettingRepo.manager.query('SELECT * FROM pricing_tiers');

                const gridMap: Record<string, string> = {};
                gridData.forEach((row: any) => {
                    gridMap[`${row.day_of_week}-${row.hour}`] = row.tier_id;
                });

                for (let i = 0; i < hours; i++) {
                    const currentHour = startHour + i;
                    baseSubtotal += Number(courtItem.base_price);

                    let hourPrice = Number(courtItem.base_price);

                    const key = `${dayOfWeek}-${currentHour}`;
                    const tierId = gridMap[key];
                    if (tierId) {
                        const tier = tiersData.find((t: any) => String(t.id) === String(tierId));
                        if (tier) {
                            hourPrice = Number(tier.price);
                            gridPricingUsed = true;
                        }
                    }
                    itemSubtotal += hourPrice;
                }

                subtotalBase += baseSubtotal;
                totalAfterRules += itemSubtotal;

                items.push({
                    type: 'court_rental',
                    itemName: courtItem.name + ` (${hours} horas)`,
                    basePrice: courtItem.base_price,
                    quantity: hours,
                    ruleApplied: gridPricingUsed ? 'Tarifa Visual por Franjas' : null,
                    unitPriceApplied: itemSubtotal / hours,
                    subtotal: itemSubtotal
                });
            }
        }

        if (addons && addons.length > 0) {
            for (const addon of addons) {
                const item = await this.itemRepo.findOne({ where: { id: addon.itemId } });
                if (item) {
                    const itemSubtotal = Number(item.base_price) * addon.quantity;
                    subtotalBase += itemSubtotal;
                    totalAfterRules += itemSubtotal;
                    items.push({
                        type: 'add_on',
                        itemName: item.name,
                        basePrice: item.base_price,
                        quantity: addon.quantity,
                        ruleApplied: null,
                        unitPriceApplied: item.base_price,
                        subtotal: itemSubtotal
                    });
                }
            }
        }

        const discountsApplied = totalAfterRules < subtotalBase ? totalAfterRules - subtotalBase : 0;
        const surchargesApplied = totalAfterRules > subtotalBase ? totalAfterRules - subtotalBase : 0;

        return {
            orderId: 'draft_' + Math.floor(Math.random() * 100000),
            player: {
                id: user?.id,
                name: user?.name,
                role: user?.role || 'general'
            },
            reservationDetails: {
                courtName: `Cancha ${courtId} (Temporal)`,
                date: date,
                startTime: start.toTimeString().substring(0, 5),
                endTime: end.toTimeString().substring(0, 5),
                totalHours: hours
            },
            items: items,
            financialSummary: {
                subtotalBase: subtotalBase,
                discountsApplied: discountsApplied,
                surchargesApplied: surchargesApplied,
                grandTotal: totalAfterRules
            }
        };
    }

    async seedInitialData() {
        let catCourt = await this.categoryRepo.save({ name: 'Cancha', is_reservable: true });
        let catAddon = await this.categoryRepo.save({ name: 'Add-on', is_reservable: false });
        let catBev = await this.categoryRepo.save({ name: 'Bebida', is_reservable: false });

        await this.itemRepo.save({ category_id: catCourt.id, name: 'Alquiler Cancha Diurno', base_price: 30000 });
        await this.itemRepo.save({ category_id: catAddon.id, name: 'Alquiler Raqueta Pro', base_price: 10000, stock: 10 });
        await this.itemRepo.save({ category_id: catAddon.id, name: 'Tubo de Pelotas x3', base_price: 25000, stock: 50 });
        await this.itemRepo.save({ category_id: catBev.id, name: 'Gatorade 500ml', base_price: 5000, stock: 100 });

        // Surcharge Peak time (18 to 22) -> +20%
        await this.ruleRepo.save({ category_id: catCourt.id, start_hour: '18:00:00', end_hour: '22:00:00', rule_type: 'multiplier', value: 1.2, priority: 10 });

        return { message: 'Catálogo y reglas inicializadas con éxito' };
    }
}
