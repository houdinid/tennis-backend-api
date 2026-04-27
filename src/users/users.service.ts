import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find({ order: { name: 'ASC' } });
    }

    async register(data: { name: string, email: string, phone: string, password: string, tennis_level: string, birthdate?: string, role?: UserRole, opt_in_academy?: boolean, opt_in_matchmaking?: boolean }): Promise<User> {
        const existingUser = await this.findByEmail(data.email);
        if (existingUser) {
            throw new ConflictException('El correo ya está registrado');
        }

        if (!data.password || data.password.trim().length < 6) {
            throw new ConflictException('La contraseña es obligatoria y debe tener al menos 6 caracteres');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = this.usersRepository.create({
            name: data.name,
            email: data.email,
            phone: data.phone,
            password_hash: hashedPassword,
            tennis_level: data.tennis_level,
            birthdate: data.birthdate ? new Date(data.birthdate) : null,
            role: data.role || UserRole.PLAYER,
            opt_in_academy: data.opt_in_academy !== undefined ? data.opt_in_academy : true,
            opt_in_matchmaking: data.opt_in_matchmaking !== undefined ? data.opt_in_matchmaking : false,
        });

        const savedUser = await this.usersRepository.save(user);
        this.sendWelcomeEmail(savedUser);
        return savedUser;
    }

    private sendWelcomeEmail(user: User) {
        console.log('---------------------------------------------------------');
        console.log(`📧 SIMULACIÓN DE CORREO ENVIADO A: ${user.email}`);
        console.log(`Asunto: ¡Bienvenido a Tennis PWA, ${user.name}!`);
        console.log(`Contenido: Hola ${user.name}, tu registro ha sido exitoso.`);
        console.log(`Tu categoría registrada es: ${user.tennis_level}`);
        console.log(`Ya puedes empezar a reservar tus canchas.`);
        console.log('---------------------------------------------------------');
    }

    async updateProfile(id: string, data: { phone?: string, password?: string }): Promise<User> {
        const user = await this.findById(id);
        if (!user) throw new UnauthorizedException('Usuario no encontrado');

        if (data.phone) user.phone = data.phone;
        if (data.password) {
            user.password_hash = await bcrypt.hash(data.password, 10);
        }

        return this.usersRepository.save(user);
    }

    async updateCategory(id: string, category: string): Promise<User> {
        const user = await this.findById(id);
        if (!user) throw new UnauthorizedException('Usuario no encontrado');

        user.tennis_level = category;
        return this.usersRepository.save(user);
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.findByEmail(email);
        if (user && await bcrypt.compare(pass, user.password_hash)) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }
    async updatePassword(email: string, pass: string): Promise<User> {
        const user = await this.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        const hashedPassword = await bcrypt.hash(pass, 10);
        user.password_hash = hashedPassword;
        return this.usersRepository.save(user);
    }

    async remove(id: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new ConflictException('Usuario no encontrado');
        }
        try {
            await this.usersRepository.remove(user);
        } catch (error) {
            console.error('Error al borrar usuario:', error);
            throw new ConflictException('No se puede borrar el usuario porque tiene registros dependientes (reservas/pagos asociados).');
        }
    }
}
