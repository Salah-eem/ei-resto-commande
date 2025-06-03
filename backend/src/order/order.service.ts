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
import { DeliveryGateway } from 'src/gateway/delivery.gateway';

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
    private readonly deliveryGateway: DeliveryGateway,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    try {
      const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
      job.stop();
    } catch {
      // ignore if not registered yet
    }
  }

  // ----------------------------
  // Common population definitions
  // ----------------------------
  private getOrderItemPopulate() {
    return [
      {
        path: 'productId',
        model: 'Product',
        select: 'name image_url productType basePrice sizes category',
        populate: {
          path: 'category',
          model: 'Category',
          select: 'name',
        },
      },
      {
        path: 'baseIngredients._id',
        model: 'Ingredient',
        select: 'name price',
      },
      {
        path: 'ingredients._id',
        model: 'Ingredient',
        select: 'name price',
      },
    ];
  }

  private getUserPopulate() {
    return {
      path: 'userId',
      model: 'User',
      select: 'firstName phone',
    };
  }

  // -----------------------------------
  // Map a populated ingredient → plain
  // -----------------------------------
  private mapIngredient(ing: any): {
    _id: string;
    name: string;
    price: number;
    quantity: number;
  } {
    const populated = (ing._id as any) || null;
    return {
      _id: (populated?._id || ing._id).toString(),
      name: populated?.name || '',
      price: populated?.price ?? ing.price ?? 0,
      quantity: ing.quantity || 1,
    };
  }

  // --------------------------------------
  // Map a single OrderItem document → JSON
  // --------------------------------------
  private mapOrderItem(oi: any): any {
    const prod = oi.productId as any;
    let computedPrice = oi.price;
    if (prod.productType === 'multiple_sizes' && Array.isArray(prod.sizes)) {
      const sizeMatch = prod.sizes.find((s: any) => s.name === oi.size);
      if (sizeMatch) computedPrice = sizeMatch.price;
    } else if (prod.productType === 'single_price' && prod.basePrice != null) {
      computedPrice = prod.basePrice;
    }

    const baseIngredients = Array.isArray(oi.baseIngredients)
      ? oi.baseIngredients.map((b: any) => this.mapIngredient(b))
      : [];
    const extras = Array.isArray(oi.ingredients)
      ? oi.ingredients.map((e: any) => this.mapIngredient(e))
      : [];

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
      baseIngredients,
      ingredients: extras,
    };
  }

  // -----------------------------------------------
  // Map an order (with populated items & user) → JSON
  // -----------------------------------------------
  private mapOrder(order: any): any {
    const user = (order.userId as any) || null;
    const customer = {
      name: user?.firstName ?? order.customer?.name,
      phone: user?.phone ?? order.customer?.phone,
    };
    const items = (order.items as any[])
      .filter((oi) => !!oi.productId)
      .map((oi) => this.mapOrderItem(oi));

    const totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

    return {
      _id: order._id,
      source: order.source,
      customer,
      items,
      totalAmount: order.totalAmount ?? totalAmount,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderType: order.orderType,
      deliveryAddress: order.deliveryAddress || null,
      lastPositionUpdate: order.lastPositionUpdate,
      positionHistory: order.positionHistory,
      createdAt: order.createdAt,
      scheduledFor: order.scheduledFor || null,
      deliveryDriver: order.deliveryDriver || null,
    };
  }

  // -------------------------------------------------------
  // 1) findDeliveryOrders: orders ready or out‐for‐delivery
  // -------------------------------------------------------
  async findDeliveryOrders(): Promise<any[]> {
    const raw = await this.orderModel
      .find({
        orderStatus: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY] },
        orderType: OrderType.DELIVERY,
      })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .lean();

    if (!raw?.length) return [];

    return raw.map((o) => this.mapOrder(o));
  }

  // -------------------------------------------------------
  // 2) findLiveOrders: in‐preparation today (incl. scheduled ≤ now)
  // -------------------------------------------------------
  async findLiveOrders(): Promise<any[]> {
    const now = new Date();
    const raw = await this.orderModel
      .find({
        orderStatus: OrderStatus.IN_PREPARATION,
        createdAt: { $gte: startOfDay(now), $lt: endOfDay(now) },
        $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }],
      })
      .sort('createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .lean();

    return raw.map((o) => this.mapOrder(o));
  }

  // -------------------------------------------------------
  // 3) getOrdersByUser: all orders for a given user
  // -------------------------------------------------------
  async getOrdersByUser(userId: string): Promise<any[]> {
    const raw = await this.orderModel
      .find({ userId })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .lean();

    return raw.map((o) => this.mapOrder(o));
  }

  // -------------------------------------------------------
  // 4) Private “create” core (for both online & by‐employee)
  // -------------------------------------------------------
  private async _create(args: {
    dto: any;
    isEmployee: boolean;
    userName?: string;
  }): Promise<Order> {
    const { dto, isEmployee, userName } = args;
    if (dto.scheduledFor) {
      const now = new Date();
      const scheduledDate = new Date(dto.scheduledFor);
      if (scheduledDate <= now) {
        throw new BadRequestException('Scheduled date must be in the future');
      }
    }

    // Build array of OrderItem inputs
    const itemsSource: any[] = isEmployee
      ? (dto.items as any[]).map((i) => this._mapItem(i))
      : (await this._getCartItems(dto.userId)).map((i) => this._mapItem(i));

    await this.checkItemsAvailability(itemsSource);

    const source = isEmployee && userName ? userName : 'online';
    const fee =
      dto.orderType === OrderType.DELIVERY
        ? this.restaurantService.getRestaurant()!.deliveryFee
        : 0;

    // Create Order shell
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
      deliveryAddress:
        dto.orderType === OrderType.DELIVERY ? dto.deliveryAddress : null,
      scheduledFor: dto.scheduledFor,
    }).save();

    // Insert OrderItems in bulk
    const inserted = await this.orderItemModel.insertMany(
      itemsSource.map((i) => ({
        ...i,
        orderId: this.toObjectId(order._id as string),
        preparedQuantity: 0,
        isPrepared: false,
      })),
    );
    const itemIds = inserted.map((it) => it._id);
    const totalAmount =
      inserted.reduce((s, it) => s + it.price * it.quantity, 0) + fee;

    // Deduct stock for each item
    await Promise.all(
      inserted.map(async (it) => {
        if (!it.productId) return;
        const prod = await this.orderItemModel.db
          .collection('products')
          .findOne({ _id: it.productId });
        if (prod?.stock != null) {
          await this.orderItemModel.db
            .collection('products')
            .updateOne(
              { _id: it.productId },
              { $inc: { stock: -it.quantity } },
            );
        }
      }),
    );

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(order._id, { items: itemIds, totalAmount }, { new: true })
      .orFail(() => new NotFoundException('Order not found after create'));

    if (!isEmployee) {
      await this.cartModel.updateOne({ userId: dto.userId }, { items: [] });
    }

    this.liveOrdersGateway.sendUpdate();
    return updatedOrder;
  }

  // -------------------------------------------------------
  // 5) getSingleOrderWithCustomer: returns mapped order
  // -------------------------------------------------------
  private async _fetchSingleOrderWithCustomer(id: string): Promise<any> {
    const raw = await this.orderModel
      .findById(id)
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .lean();

    if (!raw) throw new NotFoundException('Order not found');

    return this.mapOrder(raw);
  }

  // -------------------------------------------------------
  // 6) getOrdersWithCustomerDetails: date‐range
  // -------------------------------------------------------
  private async _fetchOrdersWithCustomer(
    start: Date,
    end: Date,
  ): Promise<any[]> {
    const all = await this.orderModel
      .find({ createdAt: { $gte: start, $lte: end } })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .lean();

    return all.map((o) => this.mapOrder(o));
  }

  async getOrdersWithCustomerDetails(start: Date, end: Date): Promise<any[]> {
    return this._fetchOrdersWithCustomer(start, end);
  }

  async getOrderWithCustomer(id: string): Promise<any> {
    return this._fetchSingleOrderWithCustomer(id);
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this._create({ dto, isEmployee: false });
  }

  async createOrderByEmployee(
    dto: CreateOrderByEmployeeDto,
    userName: string,
  ): Promise<Order> {
    return this._create({ dto, isEmployee: true, userName });
  }

  // -------------------------------------------------------
  // updateOrder core (handles item changes, stock, totals)
  // -------------------------------------------------------
  async updateOrder(
    id: string,
    dto: Partial<Omit<Order, 'totalAmount'>>,
  ): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('items').exec();
    if (!order) throw new NotFoundException('Order not found');

    this.checkModificationAllowed(order, dto);

    if (dto.items && Array.isArray(dto.items)) {
      await this.checkItemsAvailability(dto.items);
    }

    // Keep oldItems for stock adjustment
    const oldItems = (order.items as any[]) || [];
    let newItems: any[] = [];

    if (dto.items === undefined) {
      // remove items field to avoid overwriting
      const { items, ...rest } = dto;
      dto = rest as any;
    } else {
      newItems = await this.updateOrderItems(dto, id);
    }

    if (dto.items !== undefined) {
      if (!newItems.length && Array.isArray(dto.items)) {
        const ids = (dto.items as any[]).map((x) => this.toObjectId(x));
        newItems = await this.orderItemModel.find({ _id: { $in: ids } }).lean();
      }
      await this.updateProductStocks(oldItems, newItems);
    }

    if (dto.scheduledFor) {
      await this.handleRescheduleLogic(id, dto.scheduledFor);
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(id, dto, { new: true })
      .orFail(() => new NotFoundException('Order not found on update'));

    await this.recomputeTotalAmount(id, dto);
    this.liveOrdersGateway.sendUpdate();

    return this.orderModel
    .findById(id)
    .populate('items')
    .orFail(() => new NotFoundException('Order not found after update'))
    .exec();
  }

  private async handleRescheduleLogic(orderId: string, newDate: Date) {
    const orderWithItems = await this.orderModel
      .findById(orderId)
      .populate('items')
      .exec();
    if (!orderWithItems)
      throw new NotFoundException('Order not found for reschedule');

    const hasPrepared = (orderWithItems.items as any[]).some(
      (it) => it.isPrepared || it.preparedQuantity > 0,
    );

    const now = new Date();
    const scheduledDate = new Date(newDate);
    if (scheduledDate <= now) {
      throw new BadRequestException('Scheduled date must be in the future');
    }
    if (!orderWithItems.scheduledFor && hasPrepared) {
      throw new BadRequestException(
        'Cannot schedule after items prepared',
      );
    } else if (
      orderWithItems.scheduledFor &&
      hasPrepared &&
      scheduledDate > new Date(orderWithItems.scheduledFor)
    ) {
      throw new BadRequestException(
        'Cannot reschedule after items prepared',
      );
    } else {
      orderWithItems.orderStatus = OrderStatus.SCHEDULED;
      await orderWithItems.save();
      this.deliveryGateway.emitStatusUpdate(orderId, OrderStatus.SCHEDULED);
    }
  }

  private checkModificationAllowed(order: any, dto: Partial<Order>) {
    if (!dto.items) return;
    const oldItems = (order.items as any[]) || [];
    const prepared = new Map<string, any>();
    for (const it of oldItems) {
      if ((it.isPrepared || it.preparedQuantity > 0) && it._id) {
        prepared.set(String(it._id), it);
      }
    }
    for (const [id] of prepared.entries()) {
      const found = (dto.items as any[]).find(
        (ni) => String(ni._id || ni) === id,
      );
      if (!found) {
        throw new BadRequestException(
          'Cannot remove an item already prepared',
        );
      }
    }
  }

  private async updateOrderItems(
    dto: Partial<Order>,
    orderId: string,
  ): Promise<any[]> {
    const isUpdatable = (it: any): it is Record<string, any> =>
      it &&
      typeof it === 'object' &&
      it._id &&
      ('quantity' in it ||
        'price' in it ||
        'size' in it ||
        'name' in it ||
        'image_url' in it ||
        'category' in it ||
        'baseIngredients' in it ||
        'ingredients' in it);

    const allIt = (dto.items as any[]) || [];
    const existing = allIt.filter(isUpdatable);
    const fresh = allIt.filter((i) => !isUpdatable(i));

    // Update existing
    await Promise.all(
      existing.map((it) =>
        this.orderItemModel.findByIdAndUpdate(it._id, {
          $set: {
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            size: it.size,
            image_url: it.image_url,
            category: it.category,
            baseIngredients: Array.isArray(it.baseIngredients)
              ? it.baseIngredients.map((b: any) => ({
                  _id: this.toObjectId(b._id),
                  quantity: b.quantity,
                }))
              : [],
            ingredients: Array.isArray(it.ingredients)
              ? it.ingredients.map((ing: any) => ({
                  _id: this.toObjectId(ing._id),
                  quantity: ing.quantity,
                }))
              : [],
          },
        }),
      ),
    );

    // Insert new
    let created: any[] = [];
    if (fresh.length) {
      created = await this.orderItemModel.insertMany(
        fresh.map((i) => {
          const mapped = this._mapItem(i);
          return {
            ...mapped,
            orderId: this.toObjectId(orderId),
            preparedQuantity: 0,
            isPrepared: false,
          };
        }),
      );
    }

    // Build dto.items as array of all IDs
    const existingIds = existing.map((it) => it._id);
    const newIds = created.map((it) => it._id);
    dto.items = [...existingIds, ...newIds];

    // Return detailed item payloads for stock logic
    return [
      ...existing.map((it: any) => ({
        _id: it._id,
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        size: it.size,
        image_url: it.image_url,
        category: it.category,
        baseIngredients: Array.isArray(it.baseIngredients)
          ? it.baseIngredients.map((b: any) => ({
              _id: (b._id as Types.ObjectId).toString(),
              quantity: b.quantity,
            }))
          : [],
        ingredients: Array.isArray(it.ingredients)
          ? it.ingredients.map((e: any) => ({
              _id: (e._id as Types.ObjectId).toString(),
              quantity: e.quantity,
            }))
          : [],
      })),
      ...created.map((it: any) => ({
        _id: it._id,
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        size: it.size,
        image_url: it.image_url,
        category: it.category,
        baseIngredients: (it.baseIngredients as any[]).map((b: any) => ({
          _id: (b._id as Types.ObjectId).toString(),
          quantity: b.quantity,
        })),
        ingredients: (it.ingredients as any[]).map((e: any) => ({
          _id: (e._id as Types.ObjectId).toString(),
          quantity: e.quantity,
        })),
      })),
    ];
  }

  private async updateProductStocks(oldItems: any[], newItems: any[]) {
    const oldMap = new Map<string, number>();
    oldItems.forEach((it) => {
      if (it.productId) oldMap.set(String(it.productId), it.quantity);
    });
    const newMap = new Map<string, number>();
    newItems.forEach((it) => {
      if (it.productId) newMap.set(String(it.productId), it.quantity);
    });
    const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    await Promise.all(
      Array.from(allIds).map(async (pid) => {
        const oldQty = oldMap.get(pid) ?? 0;
        const newQty = newMap.get(pid) ?? 0;
        const diff = newQty - oldQty;
        if (diff !== 0) {
          const prod = await this.orderItemModel.db
            .collection('products')
            .findOne({ _id: this.toObjectId(pid) });
          if (prod?.stock != null) {
            await this.orderItemModel.db
              .collection('products')
              .updateOne(
                { _id: this.toObjectId(pid) },
                { $inc: { stock: -diff } },
              );
          }
        }
      }),
    );
  }

  private async recomputeTotalAmount(id: string, dto: Partial<Order>) {
    const ord = await this.orderModel.findById(id).populate('items').exec();
    if (!ord) throw new NotFoundException('Order not found after update');
    const items = (ord.items as any[]) || [];
    let total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const type = dto.orderType ?? ord.orderType;
    if (type === OrderType.DELIVERY) {
      const rest = this.restaurantService.getRestaurant();
      if (rest?.deliveryFee != null) total += rest.deliveryFee;
    }
    await this.orderModel
      .findByIdAndUpdate(id, { totalAmount: total }, { new: true })
      .orFail(() => new NotFoundException('Order not found after total update'));
  }

  async updatePosition(
    id: string,
    pos: { lat: number; lng: number },
  ): Promise<Order> {
    const updated = await this.orderModel
      .findByIdAndUpdate(id, { deliveryPosition: pos }, { new: true })
      .orFail(() => new NotFoundException('Order not found'));
    this.deliveryGateway.emitPositionUpdate(id, pos.lat, pos.lng);
    return updated;
  }

  async validateOrderItem(orderId: string, itemId: string): Promise<Order> {
    const item = await this.orderItemModel
      .findById(itemId)
      .orFail(() => new NotFoundException('Item not found'));
    const newQty = (item.preparedQuantity || 0) + 1;
    const done = newQty >= item.quantity;

    await this.orderItemModel.findByIdAndUpdate(itemId, {
      preparedQuantity: newQty,
      isPrepared: done,
    });

    const ord = await this.orderModel
      .findById(orderId)
      .orFail(() => new NotFoundException('Order not found'));

    const allPrepared =
      (await this.orderItemModel.countDocuments({
        orderId: this.toObjectId(orderId),
        isPrepared: false,
      })) === 0;

    if (allPrepared) {
      ord.orderStatus = OrderStatus.PREPARED;
      await ord.save();
      this.deliveryGateway.emitStatusUpdate(orderId, ord.orderStatus);
    }
    this.liveOrdersGateway.sendUpdate();
    return ord;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
      .orFail(() => new NotFoundException('Order not found'));
    this.liveOrdersGateway.sendUpdate();
    this.deliveryGateway.emitStatusUpdate(orderId, status);
    return updated;
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
    return this.orderModel.findOneAndDelete({ userId, _id: orderId }).exec();
  }

  async mergeOrders(guestId: string, userId: string): Promise<Order[]> {
    await this.orderModel.updateMany({ userId: guestId }, { userId });
    return this.getOrdersByUser(userId);
  }

  private async checkItemsAvailability(items: any[]) {
    await Promise.all(
      items.map(async (it) => {
        if (!it.productId) return;
        const prod = await this.orderItemModel.db
          .collection('products')
          .findOne({ _id: this.toObjectId(it.productId) });
        if (!prod) throw new BadRequestException(`Product not found: ${it.productId}`);
        if (prod.stock != null && it.quantity > prod.stock) {
          throw new BadRequestException(
            `Not enough stock for '${prod.name}' (requested: ${it.quantity}, available: ${prod.stock})`,
          );
        }
      }),
    );
  }

  private async _getCartItems(userId: string) {
    const cart = await this.cartModel.findOne({ userId }).orFail(() => {
      throw new BadRequestException('Cart is empty');
    });
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

      baseIngredients: Array.isArray(item.baseIngredients)
        ? item.baseIngredients.map((b: any) => ({
            _id: this.toObjectId(b._id),
            quantity: b.quantity,
          }))
        : [],

      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.map((ing: any) => ({
            _id: this.toObjectId(ing._id),
            quantity: ing.quantity,
          }))
        : [],
    };
  }

  private toObjectId(id: string | Types.ObjectId) {
    return Types.ObjectId.isValid(String(id))
      ? new Types.ObjectId(String(id))
      : (id as Types.ObjectId);
  }

  // -------------------------------------------------------------
  // Scheduled + Prepared orders
  // -------------------------------------------------------------
  async getScheduledOrders(start: Date, end: Date): Promise<any[]> {
    const raw = await this.orderModel
      .find({
        scheduledFor: { $gte: start, $lte: end },
        orderStatus: OrderStatus.SCHEDULED,
      })
      .sort('scheduledFor')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .lean();

    return raw.map((o) => this.mapOrder(o));
  }

  async getPreparedOrders(): Promise<any[]> {
    const now = new Date();
    const raw = await this.orderModel
      .find({
        orderStatus: OrderStatus.PREPARED,
        createdAt: { $gte: startOfDay(now), $lt: endOfDay(now) },
      })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .lean();

    return raw.map((o) => this.mapOrder(o));
  }

  // ------------------------------------------------------------
  // Promote scheduled orders to IN_PREPARATION if due
  // ------------------------------------------------------------
  async promoteScheduledOrdersIfDue() {
    if (!this.liveOrdersGateway.hasClients()) return;
    const now = new Date();
    const result = await this.orderModel.updateMany(
      { orderStatus: OrderStatus.SCHEDULED, scheduledFor: { $lte: now } },
      { $set: { orderStatus: OrderStatus.IN_PREPARATION } },
    );
    if (result.modifiedCount > 0) {
      this.liveOrdersGateway.sendUpdate();
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS, { name: 'promoteScheduledOrders' })
  async promoteScheduledOrdersCron() {
    await this.promoteScheduledOrdersIfDue();
  }

  startPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.start();
  }

  stopPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.stop();
  }

  // ------------------------------------------------------------
  // Like/unlike an OrderItem
  // ------------------------------------------------------------
  async likeOrderItem(itemId: string, liked: boolean) {
    const item = await this.orderItemModel.findByIdAndUpdate(
      itemId,
      { liked },
      { new: true },
    );
    if (!item) throw new NotFoundException('Order item not found');
    return item;
  }

  async getOrderItemLiked(itemId: string): Promise<{ liked: boolean }> {
    const item = await this.orderItemModel.findById(itemId).select('liked').lean();
    if (!item) throw new NotFoundException('OrderItem not found');
    return { liked: !!item.liked };
  }
}
