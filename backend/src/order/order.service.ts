import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import { Order, OrderDocument, OrderItem, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
import * as cron from 'node-cron';
import { CreateOrderDto } from './dto/create-order.dto';
import { Restaurant, RestaurantSchema } from 'src/schemas/restaurant.schema';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';


@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>,
              @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
              private restaurantService: RestaurantService,
              private readonly gateway: LiveOrdersGateway,
            ) {
            }

  // Créer une nouvelle commande
  // async createOrder(userId: string, items: any[], totalAmount: number): Promise<Order> {
  //   const order = new this.orderModel({ userId, items, totalAmount, status: OrderStatus.IN_PROGRESS, paymentStatus: PaymentStatus.PENDING });
  //   return order.save();
  // }

  updatePosition(id: string, position: { lat: number; lng: number }) {
    return this.orderModel.findByIdAndUpdate(id, { deliveryPosition: position });
  }

  // Récupérer toutes les commandes d'un utilisateur
  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  // Récupérer une commande
  async getOrder(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findOrdersInDelivery() {
    return this.orderModel.find(
      { orderStatus: OrderStatus.READY_FOR_DELIVERY , orderType: OrderType.DELIVERY },);
  }
  
  // Mettre à jour le statut d'une commande
  async updateOrderStatus(orderId: string, orderStatus: string): Promise<Order> {
    console.log(orderId, orderStatus);
    const updatedOrder = await this.orderModel.findByIdAndUpdate(orderId, { orderStatus }, { new: true });
    if (!updatedOrder) throw new NotFoundException('Order not found');
    this.gateway.sendUpdate();
    return updatedOrder;
  }

  // supprimer toutes les commandes d'un utilisateur
  async deleteOrdersByUser(userId: string): Promise<any> {
    return this.orderModel.deleteMany({ userId }).exec();
  }

  // supprimer une commande d'un utilisateur
  async deleteOrderByUser(userId: string, orderId: string): Promise<any> {
    return this.orderModel.findOneAndDelete({ userId, _id
    : orderId }).exec();
  }

  // supprimer une commande
  async deleteOrder(orderId: string): Promise<any> {
    return this.orderModel.findByIdAndDelete(orderId).exec();
  }

  // supprimer toutes les commandes
  async deleteAllOrders(): Promise<any> {
    return this.orderModel.deleteMany().exec();
  }

// Créer une commande après paiement réussi
async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
  const { userId, orderType, paymentMethod, paymentStatus, deliveryAddress } = createOrderDto;
  const cart = await this.cartModel.findOne({ userId });

  if (!cart || cart.items.length === 0) {
    throw new BadRequestException("Cart is empty.");
  }

  const deliveryFee = orderType == OrderType.DELIVERY ? this.restaurantService.getRestaurant()!.deliveryFee : 0;

  // Nettoyer les items du panier
  const orderItems: OrderItem[] = cart.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    size: item.size,
    image_url: item.image_url,
  }));

  const newOrder = new this.orderModel({
    userId,
    items: orderItems,
    totalAmount: orderItems.reduce((total, item) => total + item.price * item.quantity, 0) + deliveryFee,
    orderStatus: OrderStatus.IN_PREPARATION, // En cours de préparation
    paymentStatus,
    orderType, // Livraison ou à emporter
    paymentMethod, // Carte, PayPal ou espèces
    deliveryAddress,
  });

  await newOrder.save();
  this.gateway.sendUpdate()
  return newOrder;
}

  // 📌 Récupérer les commandes dans une plage de dates
  async getOrdersByDateRange(start: Date, end: Date): Promise<Order[]> {
    return this.orderModel.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 }).exec();
  }

  // Fusionner les commandes d'un invité avec celles d'un utilisateur authent
  async mergeOrders(guestId: string, userId: string): Promise<Order[]> {
    // Trouver les commandes associées au guestId
    const guestOrders = await this.orderModel.find({ userId: guestId });

    if (guestOrders.length) {
      // Mettre à jour chaque commande pour qu'elle soit associée à l'utilisateur authentifié
      await this.orderModel.updateMany({ userId: guestId }, { $set: { userId } });
    }

    // Retourner les commandes associées à l'utilisateur authentifié
    return this.orderModel.find({ userId });
  }

  async findLiveOrders(): Promise<Order[]> {
    return this.orderModel.find({
      orderStatus: OrderStatus.IN_PREPARATION,
    }).sort({ createdAt: 1 }).exec(); // triées de la plus ancienne à la plus récente
  }
  
  async getOrdersWithCustomerDetails(start: Date, end: Date): Promise<any[]> {
    // return this.orderModel.find({
    //   createdAt: { $gte: start, $lte: end },
    // }).sort({ createdAt: -1 }).exec();
    return this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          orderStatus: 1,
          orderType: 1,
          createdAt: 1,
          'customer.name': 1,
          'customer.phone': 1,
        },
      },
    ]).exec();
  }
}
