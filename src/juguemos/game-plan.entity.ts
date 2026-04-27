import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Court } from '../courts/court.entity';
import { Reservation } from '../reservations/reservation.entity';

export enum GamePlanStatus {
    OPEN = 'OPEN',
    MATCHED = 'MATCHED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED'
}

@Entity('game_plans')
export class GamePlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'creator_id' })
    creator: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'opponent_id' })
    opponent: User;

    @ManyToOne(() => Court)
    @JoinColumn({ name: 'court_id' })
    court: Court;

    @ManyToOne(() => Reservation, { nullable: true })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @Column({ type: 'date' })
    date: string;

    @Column()
    startTime: string;

    @Column()
    endTime: string;

    @Column({ nullable: true })
    levelRequired: string;

    @Column({
        type: 'enum',
        enum: GamePlanStatus,
        default: GamePlanStatus.OPEN
    })
    status: GamePlanStatus;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: false })
    isFallback: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
