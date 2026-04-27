import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { User, UserRole } from './users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function ensureAdmin() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    const email = 'admin@tennis.com';
    const name = 'Admin Tennis';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await userRepository.findOne({ where: { email } });
    if (!user) {
        user = userRepository.create({
            email,
            name,
            password_hash: hashedPassword,
            role: UserRole.SUPERADMIN,
            tennis_level: 'Pro',
            phone: '555-ADMIN',
            opt_in_academy: true,
            opt_in_matchmaking: true
        });
        await userRepository.save(user);
        console.log(`✅ SuperAdmin creado: ${email} / ${password}`);
    } else {
        user.password_hash = hashedPassword;
        user.role = UserRole.SUPERADMIN;
        await userRepository.save(user);
        console.log(`✅ SuperAdmin actualizado: ${email} / ${password}`);
    }

    await app.close();
    process.exit(0);
}

ensureAdmin().catch(err => {
    console.error('Error ensuring admin:', err);
    process.exit(1);
});
