import { Controller, Get } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { Public } from 'src/common/decorators/public.decorator';

@Public()
@Controller('restaurant')
export class RestaurantController {
    constructor(private restaurantService: RestaurantService) {}

    // 📌 Récupérer les informations du restaurant
    @Get('info')
    async getRestaurantInfo() {
    return this.restaurantService.getRestaurantInfo();
    }

}
