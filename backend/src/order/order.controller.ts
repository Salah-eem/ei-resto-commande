import { Controller, Get, Param, Post, Body, Put, Delete, Request, Patch, SetMetadata, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus, PaymentStatus } from 'src/schemas/order.schema';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role } from 'src/schemas/user.schema';
import { startOfDay, endOfDay } from 'date-fns';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateOrderByEmployeeDto } from './dto/create-order-by-employee.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { UserService } from 'src/user/user.service';


@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService,
                private readonly userService: UserService,
    ) {}

    @Roles(Role.Admin, Role.Employee)
    @Get('in-delivery')
    async findDeliveryOrders() {
      return this.orderService.findDeliveryOrders();
    }

    @Roles(Role.Admin, Role.Employee)
    @Get('live')
    async getLiveOrders() {
      return this.orderService.findLiveOrders();
    }

    // 📌 Récupérer toutes les commandes du jour
    @Roles(Role.Admin, Role.Employee)
    @Get('today')
    async getTodayOrders() {
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      return this.orderService.getOrdersWithCustomerDetails(start, end);
    }

    // 📌 Récupérer les commandes programmées (scheduled)
    @Roles(Role.Admin, Role.Employee)
    @Get('scheduled')
    async getScheduledOrders() {
      // On considère programmées : toutes les commandes dont la date de livraison prévue (scheduledFor) est aujourd'hui
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      return this.orderService.getScheduledOrders(start, end);
    }

    // Récupérer les commandes préparées
    @Roles(Role.Admin, Role.Employee)
    @Get('prepared')
    async getPreparedOrders() {
      return this.orderService.getPreparedOrders();
    }

    // 📌 Récupérer les commandes d'un utilisateur
    @Get('user/:userId')
    async getOrdersByUser(@Param('userId') userId: string): Promise<Order[]> {
      return this.orderService.getOrdersByUser(userId);
    }

    // 📌 Récupérer les commandes livrée par un utilisateur
    @Roles(Role.Admin, Role.Employee)
    @Get('deliveries/history')
    async getDeliveredOrdersByUser(@GetUser() user: any): Promise<Order[]> {
      if (!user) {
        throw new ForbiddenException('You must be logged in to access this resource.');
      }
      return this.orderService.getDeliveredOrdersByUser(user.userId);
    }

    @Roles(Role.Admin, Role.Employee)
    @Get('stats/quick')
    async getQuickStats(@GetUser() user: any): Promise<any> {
      if (!user) {
        throw new ForbiddenException('You must be logged in to access this resource.');
      }
      return this.orderService.getQuickStats(user.userId);
    }

    // 📌 Récupérer une commande
    @Public()
    @Get(':id')
    async getOrderById(@Param('id') id: string) {
      return this.orderService.getOrderWithCustomer(id);
    }

    // 📌 Fusionner les commandes d'un invité avec un utilisateur connecté
    @Post('merge')
    async mergeOrders(@GetUser() user: any, @Body('guestId') guestId: string) {
      console.log('user', user);

      const userId = user.userId;
      return this.orderService.mergeOrders(guestId, userId);
    }

    // 📌 Créer une commande après paiement
    @Public()
    @Post('create')
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
      console.log('createOrderDto', createOrderDto);
      return this.orderService.createOrder(createOrderDto);
    }

    // 📌 Créer une commande par un employé
    @Roles(Role.Admin, Role.Employee)
    @Post('create-by-employee')
    async createByEmployee(@Body() dto: CreateOrderByEmployeeDto, @GetUser() user: any): Promise<Order> {
      // Récupère le vrai user à partir de son email
      let userName = user?.email || 'employee';
      if (user?.email) {
        const dbUser = await this.userService.findByEmail(user.email);
        if (dbUser && dbUser.firstName) {
          userName = dbUser.firstName;
        }
      }
      return this.orderService.createOrderByEmployee(dto, userName);
    }

    // Mettre à jour une commande
    @Roles(Role.Admin, Role.Employee)
    @Put(':id')
    async updateOrder(@Param('id') id: string, @Body() orderData: Partial<Order>) {
      console.log('updateOrder controller', orderData);
      return this.orderService.updateOrder(id, orderData);
    }

    @Patch(':id/position')
    updatePosition(@Param('id') id: string, @Body() body: { lat: number; lng: number }) {
      return this.orderService.updatePosition(id, { lat: body.lat, lng: body.lng });
    }

    @Roles(Role.Admin, Role.Employee)
    @Patch(':id/validate-item')
    async validateItem(
      @Param('id') orderId: string,
      @Body() body: { itemId: string },
    ) {
      return this.orderService.validateOrderItem(orderId, body.itemId);
    }

    @Roles(Role.Admin, Role.Employee)
    @Put(':orderId/assign-delivery-driver')
    async assignDeliveryDriver(@GetUser() loggedUser: any, @Param('orderId') orderId: string): Promise<Order> {
      return this.orderService.assignDeliveryDriver(loggedUser.userId, orderId);
    }

    // 📌 Mettre à jour le statut d'une commande (Ex: après paiement)
    @Public()
    @Put(':orderId/status')
    async updateOrderStatus(@Param('orderId') orderId: string, @Body('status') status: string): Promise<Order> {
      return this.orderService.updateOrderStatus(orderId, status as OrderStatus);
    }

    // supprimer toutes les commandes
    @Roles(Role.Admin)
    @Delete('deleteAll')
    async deleteAllOrders() {
      return this.orderService.deleteAllOrders();
    }

    // supprimer une commande
    @Roles(Role.Admin)
    @Delete('delete/:orderId')
    async deleteOrder(@Param('orderId') orderId: string) {
      return this.orderService.deleteOrder(orderId);
    }

    // supprimer toutes les commandes d'un utilisateur
    @Roles(Role.Admin)
    @Delete('delete/user/:userId')
    async deleteOrdersByUser(@Param('userId') userId: string) {
      return this.orderService.deleteOrdersByUser(userId);
    }

    // supprimer une commande d'un utilisateur
    @Delete('delete/user/:userId/:orderId')
    async deleteOrderByUser(@Param('userId') userId: string, @Param('orderId') orderId: string) {
      return this.orderService.deleteOrderByUser(userId, orderId);
    }
 
    @Patch('like-item')
    async likeOrderItem(@Body() body: { itemId: string, liked: boolean }) {
      return this.orderService.likeOrderItem(body.itemId, body.liked);
    }

    @Get('item-liked/:itemId')
    async getOrderItemLiked(@Param('itemId') itemId: string) {
      return this.orderService.getOrderItemLiked(itemId);
    }
}
