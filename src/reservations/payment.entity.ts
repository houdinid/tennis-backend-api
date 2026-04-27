import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Reservation } from './reservation.entity';

export enum PaymentStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum PaymentMethod {
    GATEWAY = 'gateway',
    TRANSFER = 'transfer',
    CASH = 'cash',
}

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Reservation, (reservation) => reservation.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @Column({ name: 'receipt_media_url', nullable: true, type: 'text' })
    receipt_media_url: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        enumName: 'payment_method_type', // Coincidir con el tipo en PostgreSQL
        default: PaymentMethod.TRANSFER
    })
    payment_method: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        enumName: 'payment_status', // Coincidir con el tipo en PostgreSQL
        default: PaymentStatus.PENDING
    })
    status: PaymentStatus;

    @Column({ name: 'rejection_reason', nullable: true, type: 'text' })
    rejection_reason: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
