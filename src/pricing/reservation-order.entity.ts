import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { OrderDetail } from './order-detail.entity';

@Entity()
export class ReservationOrder {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: number;

    @ManyToOne(() => Court, { nullable: true })
    @JoinColumn({ name: 'court_id' })
    court: Court;

    @Column({ nullable: true })
    court_id: number;

    @Column({ type: 'timestamp' })
    start_time: Date;

    @Column({ type: 'timestamp' })
    end_time: Date;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    subtotal: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    total: number;

    @Column({ length: 50, default: 'draft' })
    status: string; // 'draft', 'confirmed', 'paid'

    @OneToMany(() => OrderDetail, detail => detail.order)
    details: OrderDetail[];
}
