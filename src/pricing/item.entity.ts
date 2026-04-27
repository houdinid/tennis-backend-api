import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ItemCategory } from './item-category.entity';

@Entity()
export class Item {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ItemCategory, category => category.items)
    @JoinColumn({ name: 'category_id' })
    category: ItemCategory;

    @Column()
    category_id: number;

    @Column({ length: 100 })
    name: string;

    @Column('decimal', { precision: 10, scale: 2 })
    base_price: number;

    @Column({ type: 'int', nullable: true })
    stock: number;

    @Column({ type: 'int', nullable: true, name: 'court_id' })
    court_id: number;
}
