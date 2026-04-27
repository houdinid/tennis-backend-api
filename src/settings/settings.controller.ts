import { Controller, Get, Patch, Body, BadRequestException, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../app_settings.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(
        @InjectRepository(AppSetting)
        private appSettingRepository: Repository<AppSetting>,
    ) { }

    @Get('max-reservations')
    async getMaxReservations() {
        const setting = await this.appSettingRepository.findOne({ where: { key: 'max_concurrent_reservations' } });
        return { value: setting ? parseInt(setting.value) : 2 };
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch('max-reservations')
    async updateMaxReservations(@Body() body: { value: number }) {
        if (!body.value || body.value < 1) {
            throw new BadRequestException('El valor debe ser mínimo 1.');
        }

        // Mantenemos max 10 temporalmente por seguridad
        if (body.value > 10) {
            throw new BadRequestException('El límite máximo permitido es 10 por seguridad en pruebas.');
        }

        let setting = await this.appSettingRepository.findOne({ where: { key: 'max_concurrent_reservations' } });

        if (!setting) {
            setting = this.appSettingRepository.create({
                key: 'max_concurrent_reservations',
                value: String(body.value)
            });
        } else {
            setting.value = String(body.value);
        }

        await this.appSettingRepository.save(setting);
        return { success: true, newValue: body.value };
    }

    @Get('club-hours')
    async getClubHours() {
        const openSetting = await this.appSettingRepository.findOne({ where: { key: 'club_open_time' } });
        const closeSetting = await this.appSettingRepository.findOne({ where: { key: 'club_close_time' } });

        return {
            openTime: openSetting ? openSetting.value : '06:00',
            closeTime: closeSetting ? closeSetting.value : '22:00'
        };
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch('club-hours')
    async updateClubHours(@Body() body: { openTime: string, closeTime: string }) {
        if (!body.openTime || !body.closeTime) {
            throw new BadRequestException('Se requieren hora de apertura y cierre.');
        }

        // Guardar open time
        let openSetting = await this.appSettingRepository.findOne({ where: { key: 'club_open_time' } });
        if (!openSetting) {
            openSetting = this.appSettingRepository.create({ key: 'club_open_time', value: body.openTime });
        } else {
            openSetting.value = body.openTime;
        }
        await this.appSettingRepository.save(openSetting);

        // Guardar close time
        let closeSetting = await this.appSettingRepository.findOne({ where: { key: 'club_close_time' } });
        if (!closeSetting) {
            closeSetting = this.appSettingRepository.create({ key: 'club_close_time', value: body.closeTime });
        } else {
            closeSetting.value = body.closeTime;
        }
        await this.appSettingRepository.save(closeSetting);

        return { success: true, openTime: body.openTime, closeTime: body.closeTime };
    }

    @Get('pricing')
    async getPricingConfig() {
        const tiersSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_tiers' } });
        const gridSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_grid' } });

        const defaultTiers = [
            { id: 't_offpeak', name: 'Off-Peak', color: '#68B342', price: 25000 },
            { id: 't_regular', name: 'Regular', color: '#F3B71E', price: 35000 },
            { id: 't_peak', name: 'Peak', color: '#D13212', price: 50000 }
        ];

        return {
            tiers: tiersSetting ? JSON.parse(tiersSetting.value) : defaultTiers,
            grid: gridSetting ? JSON.parse(gridSetting.value) : {}
        };
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch('pricing')
    async updatePricingConfig(@Body() body: { tiers: any[], grid: any }) {
        if (!body.tiers || !body.grid) {
            throw new BadRequestException('Se requieren tiers y grid.');
        }

        // Tiers
        let tiersSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_tiers' } });
        if (!tiersSetting) {
            tiersSetting = this.appSettingRepository.create({ key: 'pricing_tiers', value: JSON.stringify(body.tiers) });
        } else {
            tiersSetting.value = JSON.stringify(body.tiers);
        }
        await this.appSettingRepository.save(tiersSetting);

        // Grid
        let gridSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_grid' } });
        if (!gridSetting) {
            gridSetting = this.appSettingRepository.create({ key: 'pricing_grid', value: JSON.stringify(body.grid) });
        } else {
            gridSetting.value = JSON.stringify(body.grid);
        }
        await this.appSettingRepository.save(gridSetting);

        return { success: true };
    }

    @Get('cancel-policy')
    async getCancelPolicy() {
        const resSetting = await this.appSettingRepository.findOne({ where: { key: 'min_cancel_hours_reservation' } });
        const acadSetting = await this.appSettingRepository.findOne({ where: { key: 'min_cancel_hours_academy' } });

        return {
            min_cancel_hours_reservation: resSetting ? parseInt(resSetting.value) : 0,
            min_cancel_hours_academy: acadSetting ? parseInt(acadSetting.value) : 0
        };
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch('cancel-policy')
    async updateCancelPolicy(@Body() body: { min_cancel_hours_reservation: number, min_cancel_hours_academy: number }) {
        // Reservaciones
        let resSetting = await this.appSettingRepository.findOne({ where: { key: 'min_cancel_hours_reservation' } });
        if (!resSetting) {
            resSetting = this.appSettingRepository.create({ key: 'min_cancel_hours_reservation', value: String(body.min_cancel_hours_reservation || 0) });
        } else {
            resSetting.value = String(body.min_cancel_hours_reservation || 0);
        }
        await this.appSettingRepository.save(resSetting);

        // Academia
        let acadSetting = await this.appSettingRepository.findOne({ where: { key: 'min_cancel_hours_academy' } });
        if (!acadSetting) {
            acadSetting = this.appSettingRepository.create({ key: 'min_cancel_hours_academy', value: String(body.min_cancel_hours_academy || 0) });
        } else {
            acadSetting.value = String(body.min_cancel_hours_academy || 0);
        }
        await this.appSettingRepository.save(acadSetting);
        return { success: true };
    }

    @Get('pricing/resolve')
    async resolvePrice(@Query('dayOfWeek') dayOfWeek: number, @Query('hour') hour: number) {
        const tiersSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_tiers' } });
        const gridSetting = await this.appSettingRepository.findOne({ where: { key: 'pricing_grid' } });

        if (!gridSetting || !tiersSetting) {
            return { price: 30000 }; // Default fallback
        }

        const grid = JSON.parse(gridSetting.value);
        const tiers = JSON.parse(tiersSetting.value);
        
        // Match the frontend key format: "day-hour"
        const key = `${dayOfWeek}-${hour}`;
        const tierIdx = grid[key];
        
        if (tierIdx !== undefined && tiers[tierIdx]) {
            return { price: tiers[tierIdx].price };
        }

        return { price: 30000 };
    }
}
