import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Item } from './item.entity';

@Entity()
export class ItemCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ default: false })
    is_reservable: boolean;

    @OneToMany(() => Item, item => item.category)
    items: Item[];
}
