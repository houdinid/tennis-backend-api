import { Controller, Post, Body, UnauthorizedException, Get, Param, Patch, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    async register(@Body() body: any) {
        return this.usersService.register(body);
    }

    @Post('login')
    async login(@Body() body: any) {
        const user = await this.usersService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll() {
        return this.usersService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile/:id')
    async updateProfile(@Param('id') id: string, @Body() body: any) {
        return this.usersService.updateProfile(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/category')
    async updateCategory(@Param('id') id: string, @Body() body: { category: string }) {
        return this.usersService.updateCategory(id, body.category);
    }

    @Patch('update-password')
    async updatePassword(@Body() body: any) {
        return this.usersService.updatePassword(body.email, body.password);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
