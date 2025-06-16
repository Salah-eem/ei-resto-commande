import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, format, } from 'date-fns';
import mongoose from 'mongoose';
import { Restaurant } from 'src/schemas/restaurant.schema';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { Order } from 'src/schemas/order.schema'; // Import the Order schema
import { User } from 'src/schemas/user.schema';
import { HistoryPointDto } from './dto/history-point.dto';

@Injectable()
export class RestaurantService implements OnModuleInit {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: mongoose.Model<Restaurant>,
    @InjectModel(Order.name) private readonly orderModel: mongoose.Model<Order>,
    @InjectModel(User.name) private readonly userModel: mongoose.Model<User>,
  ) {}

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
    const restaurant = await this.restaurantModel
      .findOne()
      .select('address deliveryFee');
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

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1) Commandes du jour
    const todayOrders = await this.orderModel.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const todayAgg = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
    ]);
    const todayRevenue = todayAgg[0]?.sum ?? 0;

    // 2) Commandes en attente (PENDING)
    const pendingOrders = await this.orderModel.countDocuments({
      orderStatus: 'pending', // ou OrderStatus.PENDING
    });

    // 3) Statistiques du mois
    const monthOrders = await this.orderModel.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });
    const monthAgg = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
    ]);
    const monthRevenue = monthAgg[0]?.sum ?? 0;

    // 4) Clients
    const totalClients = await this.userModel.countDocuments({ role: 2 });
    // 5) Nouveaux clients ce mois
    const newClientsThisMonth = await this.userModel.countDocuments({
      role: 2,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    return {
      todayOrders,
      todayRevenue,
      pendingOrders,
      monthOrders,
      monthRevenue,
      totalClients,
      newClientsThisMonth,
    };
  }

  async getDashboardHistory(
    metric: keyof DashboardStatsDto,
  ): Promise<HistoryPointDto[]> {
    const today = new Date();
    const result: HistoryPointDto[] = [];

    // on boucle sur les 7 derniers jours (incl. aujourd’hui)
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i);
      const start = startOfDay(day);
      const end = endOfDay(day);

      let value = 0;

      switch (metric) {
        case 'todayOrders':
        case 'monthOrders': {
          // nombre de commandes créées ce jour
          value = await this.orderModel.countDocuments({
            createdAt: { $gte: start, $lte: end },
          });
          break;
        }
        case 'todayRevenue':
        case 'monthRevenue': {
          // somme des totalAmount ce jour
          const agg = await this.orderModel.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
          ]);
          value = agg[0]?.sum ?? 0;
          break;
        }
        case 'pendingOrders': {
          // commandes en attente créées ce jour
          value = await this.orderModel.countDocuments({
            orderStatus: 'pending',
            createdAt: { $gte: start, $lte: end },
          });
          break;
        }
        case 'newClientsThisMonth':
        case 'totalClients': {
          if (metric === 'newClientsThisMonth') {
            // nouveaux clients créés ce jour
            value = await this.userModel.countDocuments({
              role: 2, // ou Role.Client
              createdAt: { $gte: start, $lte: end },
            });
          } else {
            // clients totaux à la fin de ce jour
            value = await this.userModel.countDocuments({
              role: 2,
              createdAt: { $lte: end },
            });
          }
          break;
        }
        default:
          throw new NotFoundException(`Métrique inconnue: ${metric}`);
      }

      result.push({
        date: format(start, 'yyyy-MM-dd'),
        value,
      });
    }    return result;
  }

  // 📌 Statistiques de livraison pour l'application mobile
  async getDeliveryStats() {
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    // Commandes livrées aujourd'hui
    const deliveredToday = await this.orderModel.countDocuments({
      orderStatus: 'delivered',
      updatedAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Revenus d'aujourd'hui
    const todayRevenue = await this.orderModel.aggregate([
      {
        $match: {
          orderStatus: 'delivered',
          updatedAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    // Commandes en attente de livraison
    const pendingDeliveries = await this.orderModel.countDocuments({
      orderStatus: { $in: ['ready for delivery', 'out for delivery'] },
    });

    // Commandes en préparation
    const inProgressDeliveries = await this.orderModel.countDocuments({
      orderStatus: 'in preparation',
    });

    return {
      deliveredToday,
      todayRevenue: todayRevenue[0]?.total || 0,
      totalRevenue: todayRevenue[0]?.total || 0,
      pendingDeliveries,
      inProgressDeliveries,
      averageDeliveryTime: 25, // TODO: calculer le temps moyen réel
      averageRating: 4.8, // TODO: récupérer les vraies notes
    };
  }
}
