import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
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
import { endOfDay, startOfDay } from 'date-fns';
import { SchedulerRegistry, Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    private readonly restaurantService: RestaurantService,
    @Inject(forwardRef(() => LiveOrdersGateway))
    private readonly liveOrdersGateway: LiveOrdersGateway,
    private schedulerRegistry: SchedulerRegistry,
  ) {}


  onModuleInit() {
    // Arrête silencieusement le job s’il existe
    try {
      const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
      job.stop();
      // tu peux logger :
      // this.logger.log('promoteScheduledOrders cron stopped at startup');
    } catch {
      // pas encore enregistré ? on ignore
    }
  }


  async findOrdersInDelivery(): Promise<Order[]> {
    return this.orderModel.find({
      orderStatus: OrderStatus.READY_FOR_DELIVERY,
      orderType: OrderType.DELIVERY,
      createdAt: { $gte: startOfDay(new Date()), $lt: endOfDay(new Date()) },
    }).exec();
  }

  async findLiveOrders(): Promise<any[]> {
    const now = new Date();
    // On ne prend que les commandes en préparation ET qui ne sont pas programmées, OU qui sont programmées mais dont scheduledFor <= maintenant
    const orders = await this.orderModel
      .find({
        orderStatus: OrderStatus.IN_PREPARATION,
        createdAt: { $gte: startOfDay(new Date()), $lt: endOfDay(new Date()) },
        $or: [
          { scheduledFor: null },
          { scheduledFor: { $lte: now } },
        ],
      })
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
        scheduledFor: order.scheduledFor,
      };
    });
  }

  async getOrdersWithCustomerDetails(start: Date, end: Date): Promise<any[]> {
    // même implémentation que précédemment, renvoyant la liste enrichie
    return this._fetchOrdersWithCustomer(start, end);
  }

  // Récupère toutes les commandes d’un utilisateur avec détails client & produits
  async getOrdersByUser(userId: string): Promise<any[]> {
    const allOrders = await this.orderModel
      .find({ userId })
      .sort('-createdAt')
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
      // Ajout des items enrichis
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
        items,
      };
    });
  }

  async getOrderWithCustomer(id: string): Promise<any> {
    return this._fetchSingleOrderWithCustomer(id);
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this._create({ dto, isEmployee: false });
  }

  async createOrderByEmployee(dto: CreateOrderByEmployeeDto, userName: string): Promise<Order> {
    return this._create({ dto, isEmployee: true, userName });
  }

  async updateOrder(id: string, dto: Partial<Omit<Order, 'totalAmount'>>): Promise<Order> {
    return this._update(id, dto);
  }

  private async _update(id: string, dto: Partial<Order>): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('items').exec();
    if (!order) throw new NotFoundException('Order not found');
    this.checkModificationAllowed(order, dto);

    // Vérification disponibilité produits (avant modif)
    if (dto.items && Array.isArray(dto.items)) {
      await this.checkItemsAvailability(dto.items);
    }

    // Empêcher l'écrasement des items si non précisé dans dto
    let updatedOrder: OrderDocument | null = null;
    // --- Gestion du stock : charger l'ancienne commande et ses items ---
    const oldItems: any[] = order ? (order.items as any[]) : [];
    let newItemsInput: any[] = [];
    if (dto.items === undefined) {
      const { items, ...rest } = dto;
      dto = rest;
    } else if (Array.isArray(dto.items)) {
      newItemsInput = await this.updateOrderItems(dto, id);
    }
    // --- Gestion du stock lors de la modification d'une commande ---
    if (dto.items !== undefined) {
      if (newItemsInput.length === 0 && dto.items) {
        const ids = dto.items.map((id: any) => this.toObjectId(id));
        newItemsInput = await this.orderItemModel.find({ _id: { $in: ids } }).lean();
      }
      await this.updateProductStocks(oldItems, newItemsInput);
    }
    // scheduledFor: logique inchangée
    if (dto.scheduledFor) {
      const orderWithItems = await this.orderModel.findById(id).populate('items').exec();
      if (!orderWithItems) throw new NotFoundException('Order not found for scheduled check');
      const hasPrepared = (orderWithItems.items as any[]).some(item => item.isPrepared === true || item.preparedQuantity > 0);
      const now = new Date();
      const scheduledDate = new Date(dto.scheduledFor);
      if (scheduledDate <= now) {
        throw new BadRequestException("The scheduled date must be in the future");
      }
      if (!orderWithItems.scheduledFor && hasPrepared) {
        throw new BadRequestException("Impossible to schedule an order that has already been prepared or has items prepared");
      }
      else if (orderWithItems.scheduledFor && hasPrepared && scheduledDate > new Date(orderWithItems.scheduledFor)) {
        throw new BadRequestException("Impossible to schedule an order that has already been prepared or has items prepared");
      } else {
        dto.orderStatus = OrderStatus.SCHEDULED;
      }
    }
    updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, dto, { new: true })
      .orFail(() => new NotFoundException('Order not found'));
    await this.recomputeTotalAmount(id, dto);
    this.liveOrdersGateway.sendUpdate();
    const result = await this.orderModel.findById(id).populate('items').exec();
    if (!result) {
      throw new NotFoundException('Order not found');
    }
    return result;
  }

  private checkModificationAllowed(order: any, dto: Partial<Order>) {
    if (!dto.items) return;
    const oldItems = (order.items as any[]);
    const newItems = dto.items;
    // Map des items préparés dans l'ancienne commande (clé = _id ou productId)
    const preparedMap = new Map<string, any>();
    for (const item of oldItems) {
      if ((item.isPrepared === true || item.preparedQuantity > 0) && item._id) {
        preparedMap.set(String(item._id), item);
      }
    }
    // Pour chaque item préparé, vérifier qu'il existe encore dans la nouvelle liste
    for (const [id, oldItem] of preparedMap.entries()) {
      const found = newItems.find((ni: any) => String(ni._id || ni) === id);
      if (!found) {
        throw new BadRequestException("You cannot remove an item that has already been prepared");
      }
    }
  }

  private computeItemsChanged(order: any, dto: Partial<Order>): boolean {
    const oldItems = (order.items as any[]);
    const oldIds = oldItems.map(i => String(i.productId));
    const oldQtys = oldItems.map(i => i.quantity);
    const newIds = dto.items!.map((i: any) => String(i.productId || i));
    const newQtys = dto.items!.map((i: any) => i.quantity ?? null);
    return oldIds.length !== newIds.length || oldIds.some((id, idx) => id !== newIds[idx]) || oldQtys.some((q, idx) => q !== newQtys[idx]);
  }

  private computeDateChanged(order: any, dto: Partial<Order>): boolean {
    const oldDate = order.scheduledFor ? new Date(order.scheduledFor).getTime() : null;
    const newDate = dto.scheduledFor ? new Date(dto.scheduledFor).getTime() : null;
    return oldDate !== newDate;
  }

  private async updateOrderItems(dto: Partial<Order>, id: string): Promise<any[]> {
    const isUpdatableObject = (item: any) =>
      item && typeof item === 'object' && item._id && (
        'quantity' in item || 'price' in item || 'size' in item || 'name' in item || 'image_url' in item || 'category' in item
      );
    const existingItems = dto.items!.filter(isUpdatableObject);
    const newItems = dto.items!.filter((item: any) => !item || !item._id);
    for (const item of existingItems) {
      await this.orderItemModel.findByIdAndUpdate(item._id, {
        $set: {
          quantity: typeof item === 'object' && 'quantity' in item ? item.quantity : undefined,
          price: typeof item === 'object' && 'price' in item ? item.price : undefined,
          size: typeof item === 'object' && 'size' in item ? item.size : undefined,
          name: (typeof item === 'object' && 'name' in item) ? item.name : undefined,
          image_url: (typeof item === 'object' && 'image_url' in item) ? item.image_url : undefined,
          category: typeof item === 'object' && 'category' in item ? item.category : undefined,
        }
      });
    }
    const existingItemIds = existingItems.map((item: any) => item._id).concat(
      dto.items!.filter((item: any) => typeof item === 'string' || item instanceof Types.ObjectId)
    );
    let created: any[] = [];
    if (newItems.length > 0) {
      created = await this.orderItemModel.insertMany(
        newItems.map(i => ({ ...i, orderId: this.toObjectId(id), preparedQuantity: 0, isPrepared: false }))
      );
      dto.items = [...existingItemIds, ...created.map(i => i._id)];
      const currentOrder = await this.orderModel.findById(id).exec();
      if (currentOrder && currentOrder.orderStatus === OrderStatus.PREPARED) {
        dto.orderStatus = OrderStatus.IN_PREPARATION;
      }
    } else {
      dto.items = existingItemIds;
    }
    return [
      ...existingItems.map((item: any) => ({ ...item })),
      ...created.map((item: any) => ({
        ...item.toObject ? item.toObject() : item,
        _id: item._id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    ];
  }

  private async updateProductStocks(oldItems: any[], newItems: any[]) {
    const oldMap = new Map<string, { quantity: number, _id: any }>();
    for (const item of oldItems) {
      if (item.productId) {
        oldMap.set(String(item.productId), { quantity: item.quantity, _id: item._id });
      }
    }
    const newMap = new Map<string, { quantity: number, _id: any }>();
    for (const item of newItems) {
      if (item.productId) {
        newMap.set(String(item.productId), { quantity: item.quantity, _id: item._id });
      }
    }
    const allProductIds = new Set([
      ...Array.from(oldMap.keys()),
      ...Array.from(newMap.keys()),
    ]);
    for (const productId of allProductIds) {
      const oldQty = oldMap.get(productId)?.quantity ?? 0;
      const newQty = newMap.get(productId)?.quantity ?? 0;
      if (oldQty !== newQty) {
        const product = await this.orderItemModel.db.collection('products').findOne({ _id: this.toObjectId(productId) });
        if (product && product.stock !== null && product.stock !== undefined) {
          const diff = newQty - oldQty;
          if (diff !== 0) {
            await this.orderItemModel.db.collection('products').updateOne(
              { _id: this.toObjectId(productId) },
              { $inc: { stock: -diff } }
            );
          }
        }
      }
    }
  }

  private async recomputeTotalAmount(id: string, dto: Partial<Order>) {
    const populatedOrder = await this.orderModel.findById(id).populate('items').exec();
    if (!populatedOrder) throw new NotFoundException('Order not found after update');
    const items = (populatedOrder.items as any[]);
    let totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const orderType = dto.orderType ?? populatedOrder.orderType;
    if (orderType === OrderType.DELIVERY) {
      const restaurant = this.restaurantService.getRestaurant();
      if (restaurant && restaurant.deliveryFee) {
        totalAmount += restaurant.deliveryFee;
      }
    }
    await this.orderModel.findByIdAndUpdate(id, { totalAmount }, { new: true })
      .orFail(() => new NotFoundException('Order not found after total update'));
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
    this.liveOrdersGateway.sendUpdate();
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return this.orderModel
      .findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
      .orFail(() => new NotFoundException('Order not found'))
      .then(o => {
        this.liveOrdersGateway.sendUpdate();
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


  private async _create(args: { dto: any; isEmployee: boolean; userName?: string }): Promise<Order> {
    const { dto, isEmployee, userName } = args;
    if (dto.scheduledFor && dto.scheduledFor.length === 0) {
      const now = new Date();
      const scheduledDate = new Date(dto.scheduledFor);
      // scheduledFor doit être dans le futur
      if (scheduledDate <= now) {
        throw new BadRequestException("The scheduled date must be in the future");
      }
    }
    const itemsSource = isEmployee
      ? (dto.items as any[]).map(i => this._mapItem(i))
      : (await this._getCartItems(dto.userId)).map(i => this._mapItem(i));
    // Vérification disponibilité produits (avant création)
    await this.checkItemsAvailability(itemsSource);

    // Si employé, la source est le nom de l'employé, sinon 'online'
    const source = isEmployee && userName ? userName : 'online';

    const fee = dto.orderType === OrderType.DELIVERY
      ? this.restaurantService.getRestaurant()!.deliveryFee
      : 0;

    const order = await new this.orderModel({
      source,
      userId: dto.userId ?? undefined,
      customer: dto.customer,
      items: [],
      totalAmount: 0,
      orderStatus: dto.scheduledFor ? OrderStatus.SCHEDULED : OrderStatus.IN_PREPARATION,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus,
      orderType: dto.orderType,
      deliveryAddress: dto.orderType === OrderType.DELIVERY ? dto.deliveryAddress : null,
      scheduledFor: dto.scheduledFor,
    }).save();

    const createdItems = await this.orderItemModel.insertMany(
      itemsSource.map(i => ({ ...i, orderId: this.toObjectId(order._id as string | Types.ObjectId), preparedQuantity: 0, isPrepared: false }))
    );
    const itemsIds = createdItems.map(i => this.toObjectId(i.id));
    const totalAmount = createdItems.reduce((s, i) => s + i.price * i.quantity, 0) + fee;
    // --- Diminuer le stock des produits commandés (si stock limité) ---
    for (const item of createdItems) {
      if (item.productId) {
        const product = await this.orderItemModel.db.collection('products').findOne({ _id: item.productId });
        if (product && product.stock !== null && product.stock !== undefined) {
          await this.orderItemModel.db.collection('products').updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } }
          );
        }
      }
    }
    // --- Fin gestion stock ---
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

    this.liveOrdersGateway.sendUpdate();
    return updatedOrder;
  }

  private async checkItemsAvailability(items: any[]) {
    for (const item of items) {
      if (!item.productId) continue;
      const product = await this.orderItemModel.db.collection('products').findOne({ _id: this.toObjectId(item.productId) });
      if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);
      if (product.stock !== null && product.stock !== undefined) {
        if (item.quantity > product.stock) {
          throw new BadRequestException(`Not enough stock for product '${product.name}' (requested: ${item.quantity}, available: ${product.stock})`);
        }
      }
    }
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
      scheduledFor:       order.scheduledFor,
    };
  }

  /** Récupère et transforme toutes les commandes d’une plage donnée */
  private async _fetchOrdersWithCustomer(start: Date, end: Date): Promise<any[]> {
    const allOrders = await this.orderModel
      .find({ createdAt: { $gte: start, $lte: end } })
      .sort('-createdAt')
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
      // Ajout des items enrichis
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
        items,
      };
    });
  }

  // Récupérer les commandes programmées (scheduled) du jour
  async getScheduledOrders(start: Date, end: Date): Promise<any[]> {

    // On considère programmées : scheduledFor entre start et end
    const scheduledOrders = await this.orderModel
      .find({ scheduledFor: { $gte: start, $lte: end }, orderStatus: OrderStatus.SCHEDULED })
      .sort('scheduledFor')
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

    // Formatage enrichi similaire à getOrdersWithCustomerDetails
    return scheduledOrders.map(order => {
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
      return {
        _id: order._id,
        source: order.source,
        items,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
        scheduledFor: order.scheduledFor,
        deliveryAddress: order.deliveryAddress,
        positionHistory: order.positionHistory,
        lastPositionUpdate: order.lastPositionUpdate,
        customer: customerData,
        createdAt: order.createdAt,
      };
    });
  }

  // Récupérer les commandes préparées du jour
  async getPreparedOrders(): Promise<any[]> {
    const orders = await this.orderModel
      .find({
        orderStatus: OrderStatus.PREPARED,
        createdAt: { $gte: startOfDay(new Date()), $lt: endOfDay(new Date()) },
      })
      .sort('-createdAt')
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

  // Promote scheduled orders to in preparation if due
  async promoteScheduledOrdersIfDue() {
    if (!this.liveOrdersGateway.hasClients()) {
      return;
    }
    const now = new Date();
    // On ne notifie que s'il y a eu des changements
    const result = await this.orderModel.updateMany(
      { orderStatus: OrderStatus.SCHEDULED, scheduledFor: { $lte: now } },
      { $set: { orderStatus: OrderStatus.IN_PREPARATION } }
    );
    if (result.modifiedCount > 0) {
      this.liveOrdersGateway.sendUpdate();
    }
  }

  // Cron pour promouvoir les commandes programmées à IN_PREPARATION
  @Cron(CronExpression.EVERY_10_SECONDS, { name: 'promoteScheduledOrders' })
  async promoteScheduledOrdersCron() {
    await this.promoteScheduledOrdersIfDue();
  }

   // méthodes pour démarrer/stopper le cron à la volée
  startPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.start();
  }

  stopPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.stop();
  }

  /**
   * Like/unlike un OrderItem (produit dans une commande)
   */
  async likeOrderItem(itemId: string, liked: boolean) {
    const item = await this.orderItemModel.findByIdAndUpdate(
      itemId,
      { liked },
      { new: true }
    );
    if (!item) throw new NotFoundException('Order item not found');
    return item;
  }

  /**
   * Retourne l'état du bouton like pour un OrderItem donné
   */
  async getOrderItemLiked(itemId: string): Promise<{ liked: boolean }> {
    const item = await this.orderItemModel.findById(itemId).select('liked').lean();
    if (!item) throw new Error('OrderItem not found');
    return { liked: !!item.liked };
  }
}
