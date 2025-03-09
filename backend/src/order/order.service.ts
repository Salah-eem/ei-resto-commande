import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from 'src/schemas/order.schema';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  // ✅ Créer une nouvelle commande
  async createOrder(userId: string, items: any[], totalAmount: number): Promise<Order> {
    const order = new this.orderModel({ userId, items, totalAmount, status: OrderStatus.PENDING });
    return order.save();
  }

  // ✅ Récupérer toutes les commandes d'un utilisateur
  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  // ✅ Mettre à jour le statut d'une commande
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const updatedOrder = await this.orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!updatedOrder) throw new NotFoundException('Commande non trouvée');
    return updatedOrder;
  }
}
