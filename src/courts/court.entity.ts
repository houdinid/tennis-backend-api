import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CourtSurface {
    CLAY = 'clay',
    HARD = 'hard',
    GRASS = 'grass',
}

export enum CourtStatus {
    ACTIVE = 'active',
    MAINTENANCE = 'maintenance',
    DISABLED = 'disabled',
}

@Entity('courts')
export class Court {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100, unique: true })
    name: string;

    @Column({ length: 500, nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: CourtSurface,
        name: 'surface_type'
    })
    surface_type: CourtSurface;

    @Column({
        type: 'enum',
        enum: CourtStatus,
        default: CourtStatus.ACTIVE,
        name: 'status'
    })
    status: CourtStatus;

    @CreateDateColumn()
    created_at: Date;
}
