import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ReservationOrder } from './reservation-order.entity';
import { Item } from './item.entity';
import { PricingRule } from './pricing-rule.entity';

@Entity()
export class OrderDetail {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ReservationOrder, order => order.details)
    @JoinColumn({ name: 'order_id' })
    order: ReservationOrder;

    @Column()
    order_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: 'item_id' })
    item: Item;

    @Column()
    item_id: number;

    @Column({ default: 1 })
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    unit_price_applied: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    subtotal: number;

    @ManyToOne(() => PricingRule, { nullable: true })
    @JoinColumn({ name: 'rule_applied_id' })
    rule_applied: PricingRule;

    @Column({ nullable: true })
    rule_applied_id: number;
}
