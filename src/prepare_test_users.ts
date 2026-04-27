import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { User, UserRole } from './users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function prepareTestUsers() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    const testUsers = [
        { email: 'alberto@example.com', name: 'Alberto', role: UserRole.PLAYER, level: '3ª' },
        { email: 'jugador@test.com', name: 'Juan Jugador', role: UserRole.PLAYER, level: '4ª' },
        { email: 'player@tennis.com', name: 'Jugador Prueba', role: UserRole.PLAYER, level: '2ª' }
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const u of testUsers) {
        let user = await userRepository.findOne({ where: { email: u.email } });
        if (!user) {
            user = userRepository.create({
                email: u.email,
                name: u.name,
                password_hash: hashedPassword,
                role: u.role,
                tennis_level: u.level,
                phone: '555-1234',
                opt_in_academy: true,
                opt_in_matchmaking: true
            });
            await userRepository.save(user);
            console.log(`✅ Created user: ${u.email}`);
        } else {
            user.password_hash = hashedPassword;
            user.role = u.role;
            await userRepository.save(user);
            console.log(`✅ Updated password/role for user: ${u.email}`);
        }
    }

    await app.close();
    process.exit(0);
}

prepareTestUsers().catch(err => {
    console.error('Error preparing test users:', err);
    process.exit(1);
});
