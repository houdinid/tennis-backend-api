import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    OPERATOR = 'operator',
    PLAYER = 'player',
    TEACHER = 'teacher'
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    name: string;

    @Column({ unique: true, length: 255 })
    email: string;

    @Column({ nullable: true, length: 20 })
    phone: string;

    @Column({ nullable: true })
    password_hash: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PLAYER,
    })
    role: UserRole;

    @Column({ name: '2fa_secret', nullable: true, type: 'text' })
    two_fa_secret: string;

    @Column({ default: false })
    is_2fa_enabled: boolean;

    @Column({ nullable: true, length: 50 })
    tennis_level: string;

    @Column({ default: false })
    opt_in_matchmaking: boolean;

    @Column({ default: true })
    opt_in_academy: boolean;

    @Column({ type: 'date', nullable: true })
    birthdate: Date | null;

    @Column({ type: 'int', default: 5 })
    admin_rating: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
