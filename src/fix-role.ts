import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { User, UserRole } from './users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function fixUserRole() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    const email = 'admin@test.com';
    const user = await userRepository.findOne({ where: { email } });

    if (user) {
        console.log(`User found: ${user.name}, current role: ${user.role}`);
        user.role = UserRole.ADMIN;
        await userRepository.save(user);
        console.log(`✅ SUCCESS: Role updated to ADMIN for ${email}`);
    } else {
        console.log(`❌ ERROR: User ${email} not found.`);
    }

    await app.close();
}

fixUserRole();
