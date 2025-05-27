import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { Public } from 'src/common/decorators/public.decorator';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { HistoryPointDto } from './dto/history-point.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { Role } from 'src/schemas/user.schema';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('restaurant')
export class RestaurantController {
    constructor(private restaurantService: RestaurantService) {}

    // 📌 Récupérer les informations du restaurant
    @Public()
    @Get('info')
    async getRestaurantInfo() {
        return this.restaurantService.getRestaurantInfo();
    }

    @Roles(Role.Admin)
    @Get('dashboard')
    async dashboard(): Promise<DashboardStatsDto> {
        return this.restaurantService.getDashboardStats();
    }

    @Roles(Role.Admin)
    @Get('dashboard/history')
    async dashboardHistory(
        @Query('metric') metric: keyof DashboardStatsDto,
    ): Promise<HistoryPointDto[]> {
        return this.restaurantService.getDashboardHistory(metric);
    }

}
