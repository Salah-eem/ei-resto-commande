import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from 'src/schemas/order.schema';
import * as cron from 'node-cron';
import { CreateOrderDto } from './dto/create-order.dto';
import { Restaurant, RestaurantSchema } from 'src/schemas/restaurant.schema';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';
import { CreateOrderByEmployeeDto } from './dto/create-order-by-employee.dto';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private restaurantService: RestaurantService,
    private readonly gateway: LiveOrdersGateway,
  ) {}

  // Créer une nouvelle commande
  // async createOrder(userId: string, items: any[], totalAmount: number): Promise<Order> {
  //   const order = new this.orderModel({ userId, items, totalAmount, status: OrderStatus.IN_PROGRESS, paymentStatus: PaymentStatus.PENDING });
  //   return order.save();
  // }

  updatePosition(id: string, position: { lat: number; lng: number }) {
    return this.orderModel.findByIdAndUpdate(id, {
      deliveryPosition: position,
    });
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

  // Récupérer une commande avec les détails du client
  async getOrderWithCustomer(id: string): Promise<any> {
    // 1. Charger la commande sans populate
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'items.productId',
        select: 'name image_url productType basePrice sizes category',
        populate: {
          path: 'category',
          model: 'Category',
          select: 'name',
        },
      })
      .lean();
  
    if (!order) return null;
  
    // 2. Si userId est un ObjectId valide, peupler l'utilisateur
    let userData: any = null;
  
    if (order.userId && Types.ObjectId.isValid(order.userId)) {
      const user = await this.userModel
        .findById(order.userId)
        .select('firstName phone')
        .lean();
      userData = user ?? null;
    }
  
    // 3. Traiter les items
    order.items = order.items.map(item => {
      const prod = item.productId as any;
  
      let computedPrice = item.price;
  
      if (prod.productType === 'multiple_sizes' && prod.sizes) {
        const match = prod.sizes.find((s: any) => s.name === item.size);
        if (match) computedPrice = match.price;
      } else if (prod.productType === 'single_price' && prod.basePrice != null) {
        computedPrice = prod.basePrice;
      }
  
      return {
        productId: prod._id,
        name: prod.name,
        price: computedPrice,
        quantity: item.quantity,
        size: item.size,
        image_url: prod.image_url,
        category: prod.category, // { _id, name }
      };
    });
  
    // 4. Retourner l'objet final
    return {
      _id:               order._id,
      source:            order.source,
      items:             order.items,
      totalAmount:       order.totalAmount,
      orderStatus:       order.orderStatus,
      paymentMethod:     order.paymentMethod,
      paymentStatus:     order.paymentStatus,
      orderType:         order.orderType,
      deliveryAddress:   order.deliveryAddress,
      positionHistory:   order.positionHistory,
      lastPositionUpdate:order.lastPositionUpdate,
      customer: {
        name:  userData?.firstName ?? order.customer?.name,
        phone: userData?.phone     ?? order.customer?.phone,
      },
    };
  }

  async findOrdersInDelivery() {
    return this.orderModel.find({
      orderStatus: OrderStatus.READY_FOR_DELIVERY,
      orderType: OrderType.DELIVERY,
    });
  }

  // Mettre à jour le statut d'une commande
  async updateOrderStatus(
    orderId: string,
    orderStatus: string,
  ): Promise<Order> {
    console.log(orderId, orderStatus);
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      { orderStatus },
      { new: true },
    );
    if (!updatedOrder) throw new NotFoundException('Order not found');
    this.gateway.sendUpdate();
    return updatedOrder;
  }

  // Mettre à jour une commande
  async updateOrder(
    orderId: string,
    orderData: Partial<Order>,
  ): Promise<Order> {
    // 1️⃣ Récupère la commande existante
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    // 2️⃣ Merge des champs (on ignore totalAmount côté front)
    const { totalAmount: _ignore, ...rest } = orderData;
    Object.assign(order, rest);

    // 3️⃣ Recalcule le total des items
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // 4️⃣ Récupère les frais de livraison
    const deliveryFee =
    order.orderType === 'delivery'
      ? this.restaurantService.getRestaurant()!.deliveryFee
      : 0;

    // 5️⃣ Si livraison, on ajoute les frais ; sinon, on garde juste les items
    order.totalAmount =
      order.orderType === OrderType.DELIVERY
        ? itemsTotal + deliveryFee
        : itemsTotal;

    // 6️⃣ Sauvegarde et notification
    const updatedOrder = await order.save();
    this.gateway.sendUpdate();
    return updatedOrder;
  }

  // supprimer toutes les commandes d'un utilisateur
  async deleteOrdersByUser(userId: string): Promise<any> {
    return this.orderModel.deleteMany({ userId }).exec();
  }

  // supprimer une commande d'un utilisateur
  async deleteOrderByUser(userId: string, orderId: string): Promise<any> {
    return this.orderModel.findOneAndDelete({ userId, _id: orderId }).exec();
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
    const { userId, customer, orderType, paymentMethod, paymentStatus, deliveryAddress } =
      createOrderDto;
    const cart = await this.cartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty.');
    }

    const deliveryFee =
      orderType == OrderType.DELIVERY
        ? this.restaurantService.getRestaurant()!.deliveryFee
        : 0;

    // Nettoyer les items du panier
    const orderItems: OrderItem[] = cart.items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      image_url: item.image_url,
    }));

    const newOrder = new this.orderModel({
      userId: (userId && Types.ObjectId.isValid(userId)) ? new Types.ObjectId(userId) : userId,
      customer,
      items: orderItems,
      totalAmount:
        orderItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        ) + deliveryFee,
      orderStatus: OrderStatus.IN_PREPARATION, // En cours de préparation
      paymentStatus,
      orderType, // Livraison ou à emporter
      paymentMethod, // Carte, PayPal ou espèces
      deliveryAddress,
    });

    await newOrder.save();
    this.gateway.sendUpdate();
    return newOrder;
  }

  // Créer une commande par un employé
  async createOrderByEmployee(dto: CreateOrderByEmployeeDto): Promise<Order> {
    const { customer, items, orderType, paymentMethod, paymentStatus, deliveryAddress } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Items list is empty.');
    }

    const deliveryFee =
      orderType === 'delivery'
        ? this.restaurantService.getRestaurant()!.deliveryFee
        : 0;

    const totalAmount =
      items.reduce((acc, item) => acc + item.price * item.quantity, 0) +
      deliveryFee;

    const newOrder = new this.orderModel({
      source: 'employee',
      customer,
      items,
      totalAmount,
      orderStatus: OrderStatus.IN_PREPARATION,
      paymentMethod,
      paymentStatus,
      orderType,
      deliveryAddress: orderType === OrderType.DELIVERY ? deliveryAddress : null,
  });
    await newOrder.save();
    this.gateway.sendUpdate();
    return newOrder;
  }

  // 📌 Récupérer les commandes dans une plage de dates
  async getOrdersByDateRange(start: Date, end: Date): Promise<Order[]> {
    return this.orderModel
      .find({
        createdAt: { $gte: start, $lte: end },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Fusionner les commandes d'un invité avec celles d'un utilisateur authent
  async mergeOrders(guestId: string, userId: string): Promise<Order[]> {
    // Trouver les commandes associées au guestId
    const guestOrders = await this.orderModel.find({ userId: guestId });

    if (guestOrders.length) {
      // Mettre à jour chaque commande pour qu'elle soit associée à l'utilisateur authentifié
      await this.orderModel.updateMany(
        { userId: guestId },
        { $set: { userId } },
      );
    }

    // Retourner les commandes associées à l'utilisateur authentifié
    return this.orderModel.find({ userId });
  }

  async findLiveOrders(): Promise<Order[]> {
    return this.orderModel
      .find({
        orderStatus: OrderStatus.IN_PREPARATION,
      })
      .sort({ createdAt: 1 })
      .exec(); // triées de la plus ancienne à la plus récente
  }

  async getOrdersWithCustomerDetails(start: Date, end: Date): Promise<any[]> {
    const allOrders = await this.orderModel
      .find({
        createdAt: { $gte: start, $lte: end },
      })
      .sort({ createdAt: -1 })
      .select([
        '_id',
        'source',
        'totalAmount',
        'orderStatus',
        'paymentMethod',
        'paymentStatus',
        'orderType',
        'createdAt',
        'deliveryAddress',
        'customer',
        'userId',
      ].join(' '))
      .lean();
  
    // Séparation des commandes avec userId valide (ObjectId)
    const validObjectId = mongoose.Types.ObjectId.isValid;
  
    const ordersWithObjectId = allOrders.filter(o => validObjectId(o.userId!));
    const ordersWithStringId = allOrders.filter(o => !validObjectId(o.userId!));
  
    // Peupler uniquement celles qui ont un ObjectId
    const populated = await this.orderModel
      .find({ _id: { $in: ordersWithObjectId.map(o => o._id) } })
      .populate('userId', 'firstName phone')
      .select([
        '_id',
        'userId',
      ].join(' '))
      .lean();
  
    // Associer les champs peuplés
    const userMap = new Map(populated.map(o => [o._id.toString(), o.userId]));
  
    const finalOrders = allOrders.map(order => {
      const populatedUser = userMap.get(order._id.toString()) as any;
  
      return {
        _id: order._id,
        source: order.source,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        customer: {
          name:  populatedUser?.firstName ?? order.customer?.name,
          phone: populatedUser?.phone     ?? order.customer?.phone,
        },
      };
    });
  
    return finalOrders;
  }  
  
    
}
