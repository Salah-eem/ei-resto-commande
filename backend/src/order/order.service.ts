import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import { Order, OrderDocument, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
import * as cron from 'node-cron';


@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>,
              @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
            ) {
              this.startDeliveryTimer(); // Démarrer le cron job au lancement du service
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
  
  // Mettre à jour le statut d'une commande
  async updateOrderStatus(orderId: string, orderStatus: OrderStatus): Promise<Order> {
    const updatedOrder = await this.orderModel.findByIdAndUpdate(orderId, { orderStatus }, { new: true });
    if (!updatedOrder) throw new NotFoundException('Order not found');
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

  private async calculateEstimatedDeliveryTime(order: Order): Promise<number> {
    let estimatedTime = 15; // Temps de base en minutes

    // 🔹 Comptage des commandes "IN_PROGRESS"
    const inProgressCount = await this.orderModel.countDocuments({ orderStatus: OrderStatus.IN_PROGRESS });

    // 🔹 Ajustement selon le type de commande
    if (order.orderType === OrderType.DELIVERY) {
      estimatedTime += 15; // Temps moyen pour la livraison
    }

    // 🔹 Ajustement selon le nombre d'articles
    const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
    if (itemCount > 3) {
      estimatedTime += 5; // Ajoute 5 min si la commande contient plus de 3 articles
    }
    if (itemCount > 6) {
      estimatedTime += 10; // Ajoute 10 min si la commande dépasse 6 articles
    }

    // 🔹 Ajustement selon le nombre de commandes "IN_PROGRESS"
    if (inProgressCount > 5) {
      estimatedTime += 5; // Plus de 5 commandes en cours
    }
    if (inProgressCount > 10) {
      estimatedTime += 10; // Plus de 10 commandes en cours
    }
    if (inProgressCount > 15) {
      estimatedTime += 15; // Plus de 15 commandes en cours
    }

    return Math.max(15, estimatedTime); // Minimum 15 min
  }

  // le temps de livraison estimé
  async estimatedDeliveryTime(orderId: string): Promise<number> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');
    return this.calculateEstimatedDeliveryTime(order);
  }

  // Créer une commande après paiement réussi
  async createOrder(userId: string, orderType: string, paymentMethod: string, paymentStatus: string = PaymentStatus.PENDING) {
    const cart = await this.cartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty.");
    }

    const deliveryFee = orderType == OrderType.DELIVERY ? 3.99 : 0;

    const newOrder = new this.orderModel({
      userId,
      items: cart.items,
      totalAmount: cart.items.reduce((total, item) => total + ((item.price * item.quantity) + deliveryFee), 0),
      deliveryFee: deliveryFee,
      orderStatus: OrderStatus.IN_PROGRESS, // En cours de préparation
      paymentStatus, 
      orderType, // Livraison ou à emporter
      paymentMethod, // Carte, PayPal ou espèces
    });

      // ✅ Calcul automatique du temps de livraison
      newOrder.estimatedDelivery = await this.calculateEstimatedDeliveryTime(newOrder);

    await newOrder.save();
    return newOrder;
  }

  // 🔹 Cron job qui diminue `estimatedDelivery` chaque minute
  private startDeliveryTimer() {
    cron.schedule('* * * * *', async () => { // Exécute toutes les minutes
      // console.log("🕒 Mise à jour automatique des délais de livraison...");

      await this.orderModel.updateMany(
        { orderStatus: OrderStatus.IN_PROGRESS, estimatedDelivery: { $gt: 0 } },
        { $inc: { estimatedDelivery: -1 } } // Réduit de 1 min toutes les minutes
      );

      // console.log("✅ estimatedDelivery mis à jour !");
    });

    // console.log("🚀 Cron job pour `estimatedDelivery` activé !");
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
}
