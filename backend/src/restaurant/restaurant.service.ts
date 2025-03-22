import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Restaurant } from 'src/schemas/restaurant.schema';

@Injectable()
export class RestaurantService implements OnModuleInit {

    constructor(@InjectModel(Restaurant.name) private readonly restaurantModel: mongoose.Model<Restaurant>) {
          
    }

    private restaurantData: Restaurant | null = null;

    // 📌 Charger le restaurant une fois au démarrage
    async onModuleInit() {
      const restaurant = await this.restaurantModel.findOne();
      if (restaurant) {
        this.restaurantData = restaurant;
        console.log('✅ Restaurant data loaded at startup');
      }
    }
  
    // 📌 Accéder aux données du restaurant partout
    getRestaurant(): Restaurant | null {
      return this.restaurantData;
    }

    async getRestaurantInfo() {
      const restaurant = await this.restaurantModel.findOne().select('address deliveryFee');
      if (!restaurant) {
        throw new NotFoundException('Restaurant not found');
      }
      return {
        address: restaurant.address,
        deliveryFee: restaurant.deliveryFee,
      };
    }
    
  
    // 📌 Si besoin, forcer une mise à jour manuelle
    async refreshRestaurant() {
      const restaurant = await this.restaurantModel.findOne();
      if (restaurant) {
        this.restaurantData = restaurant;
      }
    }

    async updateRestaurant(restaurant: Restaurant) {
        return this.restaurantModel.updateOne({}, restaurant);
    }

}
