import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Item } from './item.entity';
import { ItemCategory } from './item-category.entity';

@Entity()
export class PricingRule {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Item, { nullable: true })
    @JoinColumn({ name: 'item_id' })
    item: Item;

    @Column({ nullable: true })
    item_id: number;

    @ManyToOne(() => ItemCategory, { nullable: true })
    @JoinColumn({ name: 'category_id' })
    category: ItemCategory;

    @Column({ nullable: true })
    category_id: number;

    @Column({ length: 50, nullable: true })
    user_role: string;

    @Column({ type: 'int', nullable: true })
    day_of_week: number;

    @Column({ type: 'time', nullable: true })
    start_hour: string;

    @Column({ type: 'time', nullable: true })
    end_hour: string;

    @Column({ length: 20 })
    rule_type: string;

    @Column('decimal', { precision: 10, scale: 2 })
    value: number;

    @Column({ default: 0 })
    priority: number;
}
