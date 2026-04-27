import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'setting_key', length: 100, unique: true })
    key: string;

    @Column({ name: 'setting_value', length: 255 })
    value: string;

    @Column({ nullable: true, length: 255 })
    description: string;

    @UpdateDateColumn()
    updated_at: Date;
}
