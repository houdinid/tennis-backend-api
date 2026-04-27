import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { JuguemosService } from './juguemos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('juguemos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JuguemosController {
    constructor(private readonly juguemosService: JuguemosService) { }

    @Get('open')
    async findAllOpen() {
        return this.juguemosService.findAllOpen();
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Get('all')
    async findAll() {
        return this.juguemosService.findAll();
    }

    @Post('create')
    async create(@Body() body: any, @Req() req: any) {
        const userId = req.user.id;
        return this.juguemosService.createGamePlan(userId, body);
    }

    @Post(':id/join')
    async join(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        return this.juguemosService.joinGamePlan(id, userId);
    }

    @Patch(':id/cancel')
    async cancel(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        return this.juguemosService.cancelGamePlan(id, userId);
    }
}
