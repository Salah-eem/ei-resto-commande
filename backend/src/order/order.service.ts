import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from 'src/schemas/cart.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderType,
} from 'src/schemas/order.schema';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderByEmployeeDto } from './dto/create-order-by-employee.dto';
import { OrderItem, OrderItemDocument } from 'src/schemas/order-item.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    private readonly restaurantService: RestaurantService,
    private readonly gateway: LiveOrdersGateway,
  ) {}


  async findOrdersInDelivery(): Promise<Order[]> {
    return this.orderModel.find({
      orderStatus: OrderStatus.READY_FOR_DELIVERY,
      orderType: OrderType.DELIVERY,
    }).exec();
  }

  async findLiveOrders(): Promise<any[]> {
    const orders = await this.orderModel
      .find({ orderStatus: OrderStatus.IN_PREPARATION })
      .sort('createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'productId',
          model: 'Product',
          select: 'name image_url productType basePrice sizes category',
          populate: {
            path: 'category',
            model: 'Category',
            select: 'name',
          },
        },
      })
      .exec();

    return orders.map(order => {
      const items = (order.items as any[]).map(oi => {
        const prod = oi.productId as any;
        let computedPrice = oi.price;

        if (prod.productType === 'multiple_sizes' && prod.sizes) {
          const sizeMatch = prod.sizes.find((s: any) => s.name === oi.size);
          if (sizeMatch) computedPrice = sizeMatch.price;
        } else if (prod.productType === 'single_price' && prod.basePrice != null) {
          computedPrice = prod.basePrice;
        }

        return {
          _id: oi._id,
          productId: prod._id,
          name: prod.name,
          price: computedPrice,
          quantity: oi.quantity,
          size: oi.size,
          image_url: prod.image_url,
          category: prod.category,
          preparedQuantity: oi.preparedQuantity ?? 0,
          isPrepared: oi.isPrepared ?? false,
        };
      });

      const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return {
        _id: order._id,
        source: order.source,
        customer: order.customer,
        items,
        totalAmount,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
        deliveryAddress: order.deliveryAddress,
        lastPositionUpdate: order.lastPositionUpdate,
        positionHistory: order.positionHistory,
        createdAt: order.createdAt,
      };
    });
  }

  async getOrdersWithCustomerDetails(start: Date, end: Date): Promise<any[]> {
    // même implémentation que précédemment, renvoyant la liste enrichie
    return this._fetchOrdersWithCustomer(start, end);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort('-createdAt').exec();
  }

  async getOrderWithCustomer(id: string): Promise<any> {
    return this._fetchSingleOrderWithCustomer(id);
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this._create({ dto, isEmployee: false });
  }

  async createOrderByEmployee(dto: CreateOrderByEmployeeDto): Promise<Order> {
    return this._create({ dto, isEmployee: true });
  }

  async updateOrder(id: string, dto: Partial<Omit<Order, 'totalAmount'>>): Promise<Order> {
    return this._update(id, dto);
  }

  private async _update(id: string, dto: Partial<Order>): Promise<Order> {
    return this.orderModel
      .findByIdAndUpdate(id, dto, { new: true })
      .orFail(() => new NotFoundException('Order not found'))
      .then(o => {
        this.gateway.sendUpdate();
        return o;
      });
  }

  async updatePosition(id: string, pos: { lat: number; lng: number }): Promise<Order> {
    return this.orderModel
      .findByIdAndUpdate(id, { deliveryPosition: pos }, { new: true })
      .orFail(() => new NotFoundException('Order not found'));
  }

  async validateOrderItem(orderId: string, itemId: string): Promise<Order> {
    // même logique de validation et bascule de statut
    const item = await this.orderItemModel.findById(itemId).orFail(
      () => new NotFoundException('Item not found'),
    );
    const newQty = (item.preparedQuantity || 0) + 1;
    const done = newQty >= item.quantity;
    await this.orderItemModel.findByIdAndUpdate(itemId, {
      preparedQuantity: newQty,
      isPrepared: done,
    });
    const order = await this.orderModel.findById(orderId).orFail(
      () => new NotFoundException('Order not found'),
    );

    const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

    const allPrepared = await this.orderItemModel
      .countDocuments({ orderId: orderObjectId, isPrepared: false }) === 0;

    if (allPrepared) {
      order.orderStatus = OrderStatus.PREPARED;
      await order.save();
    }
    this.gateway.sendUpdate();
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return this.orderModel
      .findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
      .orFail(() => new NotFoundException('Order not found'))
      .then(o => {
        this.gateway.sendUpdate();
        return o;
      });
  }

  async deleteAllOrders(): Promise<any> {
    return this.orderModel.deleteMany().exec();
  }

  async deleteOrder(orderId: string): Promise<any> {
    return this.orderModel.findByIdAndDelete(orderId).exec();
  }

  async deleteOrdersByUser(userId: string): Promise<any> {
    return this.orderModel.deleteMany({ userId }).exec();
  }

  async deleteOrderByUser(userId: string, orderId: string): Promise<any> {
    return this.orderModel
      .findOneAndDelete({ userId, _id: orderId })
      .exec();
  }

  async mergeOrders(guestId: string, userId: string): Promise<Order[]> {
    return this.orderModel
      .updateMany({ userId: guestId }, { userId })
      .then(() => this.getOrdersByUser(userId));
  }


  private async _create(args: { dto: any; isEmployee: boolean }): Promise<Order> {
    const { dto, isEmployee } = args;
    const itemsSource = isEmployee
      ? (dto.items as any[]).map(i => this._mapItem(i))
      : await this._getCartItems(dto.userId);

    const fee = dto.orderType === OrderType.DELIVERY
      ? this.restaurantService.getRestaurant()!.deliveryFee
      : 0;

    const order = await new this.orderModel({
      source: isEmployee ? 'employee' : 'customer',
      userId: dto.userId ?? undefined,
      customer: dto.customer,
      items: [],
      totalAmount: 0,
      orderStatus: OrderStatus.IN_PREPARATION,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus,
      orderType: dto.orderType,
      deliveryAddress: dto.orderType === OrderType.DELIVERY ? dto.deliveryAddress : null,
    }).save();

    const createdItems = await this.orderItemModel.insertMany(
      itemsSource.map(i => ({ ...i, orderId: this.toObjectId(order._id as string | Types.ObjectId), preparedQuantity: 0, isPrepared: false }))
    );
    const itemsIds = createdItems.map(i => this.toObjectId(i._id));
    const totalAmount = createdItems.reduce((s, i) => s + i.price * i.quantity, 0) + fee;
    // Mise à jour fiable de la commande en base
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      order._id,
      { items: itemsIds, totalAmount },
      { new: true }
    );

    if (!updatedOrder) {
      throw new NotFoundException('Order not found after update');
    }

    if (!isEmployee) {
      await this.cartModel.updateOne({ userId: dto.userId }, { items: [] });
    }

    this.gateway.sendUpdate();
    return updatedOrder;
  }

  private async _getCartItems(userId: string) {
    const cart = await this.cartModel.findOne({ userId }).orFail(
      () => new BadRequestException('Cart is empty'),
    );
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    return cart.items;
  }

  private _mapItem(item: any) {
    return {
      productId: this.toObjectId(item.productId),
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      image_url: item.image_url,
    };
  }

  private toObjectId(id: string | Types.ObjectId) {
    return Types.ObjectId.isValid(String(id))
      ? new Types.ObjectId(String(id))
      : (id as Types.ObjectId);
  }

/** Récupère et transforme une commande avec détails client & produits */
  private async _fetchSingleOrderWithCustomer(id: string): Promise<any> {
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: {
          path: 'productId',
          model: 'Product',
          select: 'name image_url productType basePrice sizes category',
          populate: {
            path: 'category',
            model: 'Category',
            select: 'name',
          },
        },
      })
      .populate({
        path: 'userId',
        model: 'User',
        select: 'firstName phone',
      })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const customerData = {
      name:  (order.userId as any)?.firstName  ?? order.customer?.name,
      phone: (order.userId as any)?.phone      ?? order.customer?.phone,
    };

    const items = (order.items as any[]).map(oi => {
      const prod = oi.productId as any;
      let computedPrice = oi.price;

      if (prod.productType === 'multiple_sizes' && prod.sizes) {
        const sizeMatch = prod.sizes.find((s: any) => s.name === oi.size);
        if (sizeMatch) computedPrice = sizeMatch.price;
      } else if (prod.productType === 'single_price' && prod.basePrice != null) {
        computedPrice = prod.basePrice;
      }

      return {
        _id:              oi._id, // Ajout de l'identifiant de l'item
        productId:        prod._id,
        name:             prod.name,
        price:            computedPrice,
        quantity:         oi.quantity,
        size:             oi.size,
        image_url:        prod.image_url,
        category:         prod.category,
        preparedQuantity: oi.preparedQuantity  ?? 0,
        isPrepared:       oi.isPrepared       ?? false,
      };
    });

    return {
      _id:                order._id,
      source:             order.source,
      items,
      totalAmount:        order.totalAmount,
      orderStatus:        order.orderStatus,
      paymentMethod:      order.paymentMethod,
      paymentStatus:      order.paymentStatus,
      orderType:          order.orderType,
      deliveryAddress:    order.deliveryAddress,
      positionHistory:    order.positionHistory,
      lastPositionUpdate: order.lastPositionUpdate,
      customer:           customerData,
    };
  }

  /** Récupère et transforme toutes les commandes d’une plage donnée */
  private async _fetchOrdersWithCustomer(start: Date, end: Date): Promise<any[]> {
    const allOrders = await this.orderModel
      .find({ createdAt: { $gte: start, $lte: end } })
      .sort('-createdAt')
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

    // Séparer selon que userId soit un ObjectId valide
    const isValidId = Types.ObjectId.isValid;
    const withOid   = allOrders.filter(o => o.userId && isValidId(o.userId.toString()));
    const populated  = await this.orderModel
      .find({ _id: { $in: withOid.map(o => o._id) } })
      .populate('userId', 'firstName phone')
      .select('_id userId')
      .lean();

    const userMap = new Map<string, any>(
      populated.map(o => [o._id.toString(), o.userId]),
    );

    return allOrders.map(order => {
      const u = userMap.get(order._id.toString()) as any;
      return {
        _id:             order._id,
        source:          order.source,
        totalAmount:     order.totalAmount,
        orderStatus:     order.orderStatus,
        paymentMethod:   order.paymentMethod,
        paymentStatus:   order.paymentStatus,
        orderType:       order.orderType,
        createdAt:       order.createdAt,
        deliveryAddress: order.deliveryAddress,
        customer: {
          name:  u?.firstName ?? order.customer?.name,
          phone: u?.phone     ?? order.customer?.phone,
        },
      };
    });
  }
}
