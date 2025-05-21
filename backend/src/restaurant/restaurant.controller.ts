import { Controller, Get, Query } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { Public } from 'src/common/decorators/public.decorator';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { HistoryPointDto } from './dto/history-point.dto';

@Public()
@Controller('restaurant')
export class RestaurantController {
    constructor(private restaurantService: RestaurantService) {}

    // 📌 Récupérer les informations du restaurant
    @Get('info')
    async getRestaurantInfo() {
        return this.restaurantService.getRestaurantInfo();
    }

    @Get('dashboard')
    async dashboard(): Promise<DashboardStatsDto> {
        return this.restaurantService.getDashboardStats();
    }

    @Get('dashboard/history')
    async dashboardHistory(
        @Query('metric') metric: keyof DashboardStatsDto,
    ): Promise<HistoryPointDto[]> {
        return this.restaurantService.getDashboardHistory(metric);
    }

}
