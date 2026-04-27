import { Controller, Post, Body, Get } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Post('simulate')
    async simulate(@Body() dto: any) {
        return this.pricingService.calculateBudget(dto);
    }

    @Post('seed')
    async seed() {
        return this.pricingService.seedInitialData();
    }
}
