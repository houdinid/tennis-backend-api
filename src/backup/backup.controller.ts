import { Controller, Get, Post, Body, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { BackupService } from './backup.service';
import { type Response } from 'express';

@Controller('backup')
export class BackupController {
    constructor(private readonly backupService: BackupService) {}

    @Get('export')
    async export(@Res() res: Response) {
        const data = await this.backupService.exportData();
        const json = JSON.stringify(data, null, 2);
        const filename = `backup_tennis_${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        res.send(json);
    }

    @Post('restore')
    async restore(@Body() data: any) {
        if (!data || !data.version) {
            throw new BadRequestException('Formato de backup inválido.');
        }
        return this.backupService.importData(data);
    }
}
