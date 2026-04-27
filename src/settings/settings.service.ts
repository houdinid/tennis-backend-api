import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../app_settings.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(AppSetting)
        private appSettingRepository: Repository<AppSetting>,
    ) { }

    async getSetting(key: string): Promise<any> {
        const setting = await this.appSettingRepository.findOne({ where: { key } });
        if (!setting) {
            // Valores por defecto consistentes con el script SQL
            if (key === 'max_concurrent_reservations') return { value: '2' };
            throw new NotFoundException(`Setting with key ${key} not found`);
        }
        return setting;
    }

    async setSetting(key: string, value: any, description?: string): Promise<AppSetting> {
        let setting = await this.appSettingRepository.findOne({ where: { key } });

        if (setting) {
            setting.value = String(value);
            if (description) setting.description = description;
        } else {
            setting = this.appSettingRepository.create({
                key,
                value: String(value),
                description,
            });
        }

        return await this.appSettingRepository.save(setting);
    }
}
