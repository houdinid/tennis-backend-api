import { Controller, Post, Get, Body, Param, NotFoundException, ConflictException, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('academy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademyController {
    constructor(private readonly academyService: AcademyService) { }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Post('classes')
    async create(@Body() body: any) {
        return this.academyService.createClass(body);
    }

    @Get('classes')
    async findAll(@Query('includePast') includePast?: string) {
        return this.academyService.findAll(includePast === 'true');
    }

    @Post('classes/:id/join')
    async join(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        return this.academyService.joinClass(id, userId);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Delete('classes/:id')
    async delete(@Param('id') id: string) {
        return this.academyService.deleteClass(id);
    }

    @Post('classes/:id/leave')
    async leave(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        return this.academyService.leaveClass(id, userId);
    }
}
