import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/reservation.entity';

@Entity('academy_classes')
export class AcademyClass {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'teacher_id' })
    teacher: User;

    @ManyToOne(() => Reservation, { cascade: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @Column({ type: 'int', default: 4 })
    capacity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price_per_person: number;

    @Column({ length: 50, nullable: true })
    level_required: string;

    @Column({ type: 'simple-array', nullable: true })
    student_ids: string[];

    @Column({ length: 50, nullable: true })
    age_group: string;

    @Column({ type: 'text', nullable: true })
    topics_covered: string;

    @Column({ default: false })
    show_topics: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
