import { Controller, Post, Body, Get, Param, UseInterceptors, UploadedFile, BadRequestException, Patch, Query, Delete, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservationsService } from './reservations.service';
import { memoryStorage } from 'multer';
import { extname } from 'path';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Get()
    async findAll(@Req() req: any, @Query('date') date?: string) {
        return this.reservationsService.findAll(req.user, date);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Get('dashboard-summary')
    async getDashboardSummary() {
        return this.reservationsService.getDashboardSummary();
    }

    @Post()
    async create(
        @Req() req: any,
        @Body() data: { 
            userId: string; // Se mantiene en el DTO por compatibilidad pero se valida
            courtId: number; 
            startTime: string; 
            endTime: string; 
            createdByUserId?: string;
            addons?: { itemId: string; quantity: number }[];
            autoPay?: boolean;
            type?: any;
        },
    ) {
        // SEGURIDAD: Si no es admin, el userId DEBE ser el del token
        const isAdmin = [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR].includes(req.user.role);
        const effectiveUserId = isAdmin ? (data.userId || req.user.id) : req.user.id;
        const effectiveCreatedBy = req.user.id;

        console.log(`Creando reserva para usuario ${effectiveUserId} por ${effectiveCreatedBy}`);
        return this.reservationsService.createReservation(
            effectiveUserId,
            data.courtId,
            new Date(data.startTime),
            new Date(data.endTime),
            effectiveCreatedBy,
            data.addons || [],
            !!data.autoPay,
            data.type
        );
    }

    @Post(':id/upload-payment')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage()
    }))
    async uploadFile(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('uploaderRole') uploaderRole?: string,
        @Body('uploaderName') uploaderName?: string
    ) {
        if (!file) throw new BadRequestException('Archivo no recibido');
        console.log(`Recibida solicitud de subida a Supabase para reserva ${id}`);
        return this.reservationsService.uploadPaymentProof(id, file, uploaderRole, uploaderName);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch(':id/approve-payment')
    async approvePayment(@Param('id') id: string) {
        return this.reservationsService.approvePayment(id);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR)
    @Patch(':id/reject-payment')
    async rejectPayment(@Param('id') id: string) {
        return this.reservationsService.rejectPayment(id);
    }

    @Delete(':id')
    async cancelReservation(@Param('id') id: string, @Req() req: any) {
        // Ahora el userId viene de forma segura del token JWT decodificado
        const userIdFromToken = req.user.id;
        return this.reservationsService.cancelReservation(id, userIdFromToken);
    }
}
