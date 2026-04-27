import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtStatus, CourtSurface } from './court.entity';

@Controller('courts')
export class CourtsController {
    constructor(private readonly courtsService: CourtsService) { }

    @Get()
    findAll() {
        return this.courtsService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; description: string; surface_type?: CourtSurface; base_price?: number }) {
        return this.courtsService.create(body.name, body.description, body.surface_type, body.base_price);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { name: string; description: string; status?: CourtStatus; base_price?: number },
    ) {
        return this.courtsService.update(id, body.name, body.description, body.status, body.base_price);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.courtsService.remove(id);
    }
}
