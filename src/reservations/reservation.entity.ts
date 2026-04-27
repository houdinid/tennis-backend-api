import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { Payment } from './payment.entity';

export enum ReservationStatus {
    RESERVED_PENDING_PAYMENT = 'reserved_pending_payment',
    PAYMENT_UNDER_REVIEW = 'payment_under_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled'
}

export enum ReservationType {
    STANDARD = 'standard',
    TEACHER_BLOCK = 'teacher_block',
    TOURNAMENT = 'tournament',
    MAINTENANCE = 'maintenance'
}

@Entity('reservations')
export class Reservation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_id' })
    created_by: User;

    @ManyToOne(() => Court)
    @JoinColumn({ name: 'court_id' })
    court: Court;

    @Column({ type: 'timestamp' })
    start_time: Date;

    @Column({ type: 'timestamp' })
    end_time: Date;

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.RESERVED_PENDING_PAYMENT,
    })
    status: ReservationStatus;

    @Column({
        type: 'enum',
        enum: ReservationType,
        default: ReservationType.STANDARD,
    })
    type: ReservationType;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ type: 'simple-json', nullable: true })
    addons: { itemId: string; name: string; price: number; quantity: number }[];

    @OneToOne(() => Payment, payment => payment.reservation)
    payment: Payment;
}
