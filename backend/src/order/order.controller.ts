import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus } from 'src/schemas/order.schema';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // 📌 Récupérer les commandes d'un utilisateur
    @Get('user/:userId')
    async getOrdersByUser(@Param('userId') userId: string): Promise<Order[]> {
      return this.orderService.getOrdersByUser(userId);
    }

    // 📌 Créer une commande après paiement
    @Post('create')
    async createOrder(@Body() body: { userId: string; items: any[]; totalAmount: number }): Promise<Order> {
      return this.orderService.createOrder(body.userId, body.items, body.totalAmount);
    }

    // 📌 Mettre à jour le statut d'une commande (Ex: après paiement)
    @Put(':orderId/status')
    async updateOrderStatus(@Param('orderId') orderId: string, @Body('status') status: OrderStatus): Promise<Order> {
      return this.orderService.updateOrderStatus(orderId, status);
    }
}
