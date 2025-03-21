import { Controller, Get, Param, Post, Body, Put, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus } from 'src/schemas/order.schema';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';

// @UseGuards(JwtGuard)
@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // 📌 Récupérer les commandes d'un utilisateur
    @Get('user/:userId')
    async getOrdersByUser(@Param('userId') userId: string): Promise<Order[]> {
      return this.orderService.getOrdersByUser(userId);
    }

    // 📌 Récupérer une commande
    @Get(':orderId')
    async getOrder(@Param('orderId') orderId: string): Promise<Order> {
      return this.orderService.getOrder(orderId);
    }

    // 📌 Fusionner les commandes d'un invité avec un utilisateur connecté
    @Post('merge')
    async mergeOrders(@GetUser() user: any, @Body('guestId') guestId: string) {
      const userId = user.userId;
      return this.orderService.mergeOrders(guestId, userId);
    }

    // 📌 Créer une commande après paiement
    @Post('create')
    async createOrder(@Body() body: { userId: string; orderType: string, paymentMethod: string }): Promise<Order> {
      return this.orderService.createOrder(body.userId, body.orderType, body.paymentMethod);
    }

    @Patch(':id/position')
    updatePosition(@Param('id') id: string, @Body() body: { lat: number; lng: number }) {
      return this.orderService.updatePosition(id, { lat: body.lat, lng: body.lng });
    }

    // 📌 Mettre à jour le statut d'une commande (Ex: après paiement)
    @Put(':orderId/status')
    async updateOrderStatus(@Param('orderId') orderId: string, @Body('status') status: OrderStatus): Promise<Order> {
      return this.orderService.updateOrderStatus(orderId, status);
    }

    // supprimer toutes les commandes
    @Delete('deleteAll')
    async deleteAllOrders() {
      return this.orderService.deleteAllOrders();
    }

    // supprimer une commande
    @Delete('delete/:orderId')
    async deleteOrder(@Param('orderId') orderId: string) {
      return this.orderService.deleteOrder(orderId);
    }

    // supprimer toutes les commandes d'un utilisateur
    @Delete('delete/user/:userId')
    async deleteOrdersByUser(@Param('userId') userId: string) {
      return this.orderService.deleteOrdersByUser(userId);
    }

    // supprimer une commande d'un utilisateur
    @Delete('delete/user/:userId/:orderId')
    async deleteOrderByUser(@Param('userId') userId: string, @Param('orderId') orderId: string) {
      return this.orderService.deleteOrderByUser(userId, orderId);
    }
}
