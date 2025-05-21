import { Global, Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from 'src/schemas/restaurant.schema';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: 'Restaurant', schema: RestaurantSchema}]),
            MongooseModule.forFeature([{ name: 'Order', schema: RestaurantSchema}]),
            MongooseModule.forFeature([{ name: 'User', schema: RestaurantSchema}])
            ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
