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
import { MailService } from 'src/mail/mail.service';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    private readonly restaurantService: RestaurantService,
    @Inject(forwardRef(() => LiveOrdersGateway))
    private readonly liveOrdersGateway: LiveOrdersGateway,
    private readonly deliveryGateway: DeliveryGateway,
    private readonly mailService: MailService,
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
    ];
  }

  private getUserPopulate() {
    return {
      path: 'userId',
      model: 'User',
      select: 'firstName phone',
    };
  }
  private getDeliveryDriverPopulate() {
    return {
      path: 'deliveryDriver',
      model: 'User',
      select: 'email firstName lastName phone',
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
    // 1) ProductId en string
    const prodId =
      oi.productId && (oi.productId as any)._id
        ? (oi.productId as any)._id.toString()
        : (oi.productId as Types.ObjectId).toString();

    // 2) Copie des données du produit
    const name = oi.name;
    const price = oi.price;
    const quantity = oi.quantity;
    const size = oi.size;
    const image_url = oi.image_url;
    const category = oi.category; // { _id, name, idx }
    const preparedQuantity = oi.preparedQuantity ?? 0;
    const isPrepared = oi.isPrepared ?? false;

    // 3) baseIngredientsSnapshot → formaté en baseIngredients
    const baseIngredients = Array.isArray(oi.baseIngredientsSnapshot)
      ? (oi.baseIngredientsSnapshot as any[]).map((snap) => ({
          _id: (snap._id as Types.ObjectId).toString(),
          name: snap.name,
          price: snap.unitPrice,
          quantity: snap.quantity,
        }))
      : [];

    // 4) extraIngredientsSnapshot → renvoyé directement sous “ingredients”
    const extraIngredients = Array.isArray(oi.extraIngredientsSnapshot)
      ? (oi.extraIngredientsSnapshot as any[]).map((snap) => ({
          _id: (snap._id as Types.ObjectId).toString(),
          name: snap.name,
          price: snap.unitPrice,
          quantity: snap.quantity,
        }))
      : [];

    return {
      _id: oi._id.toString(),
      productId: prodId,
      name,
      price,
      quantity,
      size,
      image_url,
      category,
      preparedQuantity,
      isPrepared,

      // Clé facultative : si vous voulez exposer séparément la base
      baseIngredients,

      // Clé “ingredients” = tout ce qui était envoyé par le frontend
      ingredients: extraIngredients,
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

    const totalAmount = items.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0,
    );

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
        orderStatus: {
          $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY],
        },
        orderType: OrderType.DELIVERY,
      })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .populate(this.getDeliveryDriverPopulate())
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

    // 1) On prépare le tableau itemsSource (avec _mapItem), inchangé
    let itemsSource: any[];
    if (isEmployee) {
      itemsSource = await Promise.all(
        (dto.items as any[]).map((i) => this._mapItem(i)),
      );
    } else {
      const cartItems = await this._getCartItems(dto.userId);
      itemsSource = await Promise.all(cartItems.map((i) => this._mapItem(i)));
    }

    await this.checkItemsAvailability(itemsSource);

    const source = isEmployee && userName ? userName : 'online';
    const fee =
      dto.orderType === OrderType.DELIVERY
        ? this.restaurantService.getRestaurant()!.deliveryFee
        : 0;

    // 2) Création de l’Order “vide” (shell)
    const order = await new this.orderModel({
      source,
      userId: dto.userId ?? undefined,
      customer: dto.customer,
      items: [],
      totalAmount: 0,
      orderStatus: dto.scheduledFor
        ? OrderStatus.SCHEDULED
        : OrderStatus.IN_PREPARATION,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus,
      orderType: dto.orderType,
      deliveryAddress:
        dto.orderType === OrderType.DELIVERY ? dto.deliveryAddress : null,
      scheduledFor: dto.scheduledFor,
    }).save();

    // 3) Insertion en masse des OrderItems
    const inserted = await this.orderItemModel.insertMany(
      itemsSource.map((i) => ({
        ...i,
        orderId: this.toObjectId(order._id as string),
        preparedQuantity: 0,
        isPrepared: false,
      })),
    );
    const itemIds = inserted.map((it) => it._id);

    // Recalculer totalAmount en tenant compte uniquement du surplus d’extras
    let totalAmount = 0;

    for (const it of inserted) {
      // 1) Prix de base du produit pour 1 unité
      const basePrice = (it as any).price;

      // 2) Somme des coûts d’extras :
      //    Pour chaque ingrédient dans extraIngredientsSnapshot, on déduit la quantité de base s’il y en a
      const baseMap: Record<string, number> = {};
      if (Array.isArray((it as any).baseIngredientsSnapshot)) {
        for (const b of (it as any).baseIngredientsSnapshot as any[]) {
          baseMap[(b._id as Types.ObjectId).toString()] = b.quantity;
        }
      }

      // 2.a) Parcourir extraIngredientsSnapshot et ne facturer que (qtyExtra – qtyBase)
      let extrasCostUnitaire = 0;
      if (Array.isArray((it as any).extraIngredientsSnapshot)) {
        for (const e of (it as any).extraIngredientsSnapshot as any[]) {
          const idStr = (e._id as Types.ObjectId).toString();
          const qtyExtra = e.quantity;
          const qtyBase = baseMap[idStr] ?? 0;
          const surplus = qtyExtra - qtyBase;
          if (surplus > 0) {
            // unitPrice est déjà stocké dans extraIngredientsSnapshot → e.unitPrice
            extrasCostUnitaire += e.unitPrice * surplus;
          }
        }
      }

      // 3) Coût total pour cet OrderItem = (prix de base + extrasCostUnitaire) × quantity du produit
      totalAmount += (basePrice + extrasCostUnitaire) * it.quantity;
    }

    // 4) Si c’est une livraison, ajouter le deliveryFee
    totalAmount += fee;

    // 5) Mise à jour de la commande avec le total corrigé
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        order._id,
        { items: itemIds, totalAmount },
        { new: true },
      )
      .orFail(() => new NotFoundException('Order not found after create'));
    // 7) Si c’est un client (non employé), on vide le panier
    if (!isEmployee) {
      await this.cartModel.updateOne({ userId: dto.userId }, { items: [] });
    }

    // 8) Notification des “live orders”
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
      throw new BadRequestException('Cannot schedule after items prepared');
    } else if (
      orderWithItems.scheduledFor &&
      hasPrepared &&
      scheduledDate > new Date(orderWithItems.scheduledFor)
    ) {
      throw new BadRequestException('Cannot reschedule after items prepared');
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
        throw new BadRequestException('Cannot remove an item already prepared');
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
    const ord = await this.orderModel.findById(id).exec();
    if (!ord) throw new NotFoundException('Order not found after update');

    // On lit tous les OrderItem liés, sans repopulate
    const items = await this.orderItemModel
      .find({ orderId: this.toObjectId(id) })
      .lean();

    let total = 0;
    for (const it of items) {
      const baseCost = (it as any).price * (it as any).quantity;
      const extrasCost = ((it as any).ingredientsSnapshot as any[]).reduce(
        (sum, snap) => sum + snap.unitPrice * snap.quantity,
        0,
      );
      total += ((it as any).price + extrasCost) * (it as any).quantity;
    }

    const type = dto.orderType ?? ord.orderType;
    if (type === OrderType.DELIVERY) {
      const rest = this.restaurantService.getRestaurant();
      if (rest?.deliveryFee != null) total += rest.deliveryFee;
    }

    await this.orderModel
      .findByIdAndUpdate(id, { totalAmount: total }, { new: true })
      .orFail(
        () => new NotFoundException('Order not found after total update'),
      );
  }

  async updatePosition(
    id: string,
    pos: { lat: number; lng: number },
  ): Promise<Order> {
    const updated = await this.orderModel
      .findByIdAndUpdate(id, 
        { lastDeliveryPosition: pos, 
          $push: { positionHistory: { ...pos, timestamp: new Date() } } }, 
          { new: true })
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
    loggedUserId = null
  ): Promise<Order> {
    // 1) Met à jour le statut et récupère la commande mise à jour
    let updatedOrder = await this.orderModel
      .findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: [
          {
            path: 'productId',
            model: 'Product',
            select: 'name',
          },
          {
            path: 'baseIngredientsSnapshot._id',
            model: 'Ingredient',
            select: 'name',
          },
          {
            path: 'extraIngredientsSnapshot._id',
            model: 'Ingredient',
            select: 'name',
          },
        ],
      })
      .orFail(() => new NotFoundException('Order not found'));

    // 2) On notifie les websockets
    this.liveOrdersGateway.sendUpdate();
    this.deliveryGateway.emitStatusUpdate(orderId, status);
    this.deliveryGateway.broadcastDeliveryOrders();

    // 3) Si la commande appartient à un client (userId présent) et que l’on a un e-mail,
    //    on envoie l’e-mail correspondant au type de commande + nouveau statut.
    // console.log('updated order', updatedOrder);
    if (updatedOrder.userId) {
      const user = await this.userModel.findById(updatedOrder.userId).lean();
      const toEmail = user?.email;
      if (toEmail) {
        if (status === OrderStatus.PICKED_UP || status === OrderStatus.DELIVERED) {
          // Fire & forget
          this.mailService
            .sendOrderReceipt(toEmail, updatedOrder)
            .catch((err) => {
              console.error(`Erreur e-mail Receipt to ${toEmail}:`, err);
            });
        }
      }
    }
    return updatedOrder;
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
        if (!prod)
          throw new BadRequestException(`Product not found: ${it.productId}`);
        if (prod.stock != null && it.quantity > prod.stock) {
          throw new BadRequestException(
            `Not enough stock for '${prod.name}' (requested: ${it.quantity}, available: ${prod.stock})`,
          );
        }
      }),
    );
  }

  private async _getCartItems(userId: string) {
    const cart = await this.cartModel
      .findOne({ userId })
      .populate('items.category')
      .orFail(() => {
        throw new BadRequestException('Cart is empty');
      });
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    return cart.items;
  }

  private async _mapItem(item: any): Promise<Partial<OrderItem>> {
    // 1) Récupérer le produit “live” pour name+price
    const prodDoc = await this.orderItemModel.db
      .collection('products')
      .findOne({ _id: this.toObjectId(item.productId) });
    if (!prodDoc) {
      throw new NotFoundException(`Product not found: ${item.productId}`);
    }

    const productName: string = prodDoc.name;
    const productPrice: number =
      prodDoc.productType === 'multiple_sizes'
        ? ((prodDoc.sizes || []).find((s: any) => s.name === item.size)
            ?.price ?? 0)
        : (prodDoc.basePrice ?? 0);

    // 2) Construire baseIngredientsSnapshot à partir de item.baseIngredients
    const baseSnapshots: {
      _id: Types.ObjectId;
      name: string;
      unitPrice: number;
      quantity: number;
    }[] = [];
    if (Array.isArray(item.baseIngredients)) {
      for (const b of item.baseIngredients) {
        const ingDoc = await this.orderItemModel.db
          .collection('ingredients')
          .findOne({ _id: this.toObjectId(b._id) });
        if (!ingDoc) {
          throw new NotFoundException(`Base ingredient not found: ${b._id}`);
        }
        baseSnapshots.push({
          _id: ingDoc._id,
          name: ingDoc.name,
          unitPrice: typeof ingDoc.price === 'number' ? ingDoc.price : 0,
          quantity: b.quantity ?? 1,
        });
      }
    }

    // 3) Copier TOUT item.ingredients (brut) dans extraIngredientsSnapshot
    //    sans retrancher quoi que ce soit à baseSnapshots.
    const extraSnapshots: {
      _id: Types.ObjectId;
      name: string;
      unitPrice: number;
      quantity: number;
    }[] = [];
    if (Array.isArray(item.ingredients)) {
      for (const ingRef of item.ingredients as any[]) {
        const ingDoc = await this.orderItemModel.db
          .collection('ingredients')
          .findOne({ _id: this.toObjectId(ingRef._id) });
        if (!ingDoc) {
          throw new NotFoundException(
            `Extra ingredient not found: ${ingRef._id}`,
          );
        }
        extraSnapshots.push({
          _id: ingDoc._id,
          name: ingDoc.name,
          unitPrice: typeof ingDoc.price === 'number' ? ingDoc.price : 0,
          quantity: ingRef.quantity ?? 1,
        });
      }
    }

    // 4) On renvoie l’objet partiel pour insertMany
    return {
      productId: this.toObjectId(item.productId),
      name: productName,
      price: productPrice,
      quantity: item.quantity,
      size: item.size,
      image_url: item.image_url,
      category: {
        _id: this.toObjectId(item.category._id),
        name: item.category.name,
        idx: item.category.idx,
      },
      baseIngredientsSnapshot: baseSnapshots,
      extraIngredientsSnapshot: extraSnapshots,
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

  // ------------------------------------------------------------
  // Cron: Promote PREPARED orders to READY_FOR_PICKUP/DELIVERY after 10min
  // ------------------------------------------------------------
  @Cron(CronExpression.EVERY_MINUTE, { name: 'promotePreparedOrders' })
  async promotePreparedOrdersCron() {
    const tenMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
    const preparedOrders = await this.orderModel.find({
      orderStatus: OrderStatus.PREPARED,
      updatedAt: { $lte: tenMinutesAgo },
    }).lean();
    if (!preparedOrders.length) return;
    const bulk = this.orderModel.collection.initializeUnorderedBulkOp();
    let changed = false;
    for (const order of preparedOrders) {
      if (order.orderType === OrderType.PICKUP) {
        bulk.find({ _id: order._id }).updateOne({ $set: { orderStatus: OrderStatus.READY_FOR_PICKUP } });
        changed = true;
      } else if (order.orderType === OrderType.DELIVERY) {
        bulk.find({ _id: order._id }).updateOne({ $set: { orderStatus: OrderStatus.READY_FOR_DELIVERY } });
        changed = true;
      }
    }
    if (changed) {
      await bulk.execute();
      this.liveOrdersGateway.sendUpdate();
      this.deliveryGateway.broadcastDeliveryOrders();
    }
  }

  startPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.start();
  }

  stopPromoteScheduledCron() {
    const job = this.schedulerRegistry.getCronJob('promoteScheduledOrders');
    job.stop();
  }

  startPromotePreparedCron() {
    const job = this.schedulerRegistry.getCronJob('promotePreparedOrders');
    job.start();
  }

  stopPromotePreparedCron() {
    const job = this.schedulerRegistry.getCronJob('promotePreparedOrders');
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
    const item = await this.orderItemModel
      .findById(itemId)
      .select('liked')
      .lean();
    if (!item) throw new NotFoundException('OrderItem not found');
    return { liked: !!item.liked };
  }

  // Assign a delivery driver to an order
  async assignDeliveryDriver(driverId: string, orderId: string): Promise<Order> {
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(orderId, { deliveryDriver: driverId }, { new: true })
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .orFail(() => new NotFoundException('Order not found'));
    return updatedOrder;
  }

  // Récupérer les commandes livrées par un utilisateur
  async getDeliveredOrdersByUser(userId: string): Promise<any[]> {
    const raw = await this.orderModel
      .find({ deliveryDriver: userId, orderStatus: OrderStatus.DELIVERED })
      .sort('-createdAt')
      .populate({
        path: 'items',
        model: 'OrderItem',
        populate: this.getOrderItemPopulate(),
      })
      .populate(this.getUserPopulate())
      .lean();

    return raw.map((o) => this.mapOrder(o));
  }  async getQuickStats(userId?: string): Promise<{
    todayOrders: number;
    activeDeliveries: number;
    totalRevenue: number;
    averageDeliveryTime: number;
    completionRate: number;
    pendingOrders: number;
    inProgressOrders: number;
    deliveredToday: number;
    avgOrderValue: number;
    onTimeDeliveryRate: number;
  }> {
    try {      
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      // Debug logging
      console.log('GetQuickStats called with userId:', userId);
      console.log('Date range:', { startOfToday, endOfToday });

      // Build base filters - if userId is provided, filter for that specific driver
      const baseFilter: any = {};
      const todayFilter: any = {
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      };

      // If userId is provided, filter for driver-specific stats
      if (userId) {
        baseFilter.deliveryDriver = userId;
        todayFilter.deliveryDriver = userId;
        console.log('Filtering for driver:', userId);
      } else {
        console.log('No driver filter applied - getting global stats');
      }

      // Debug: Check total orders in database
      const totalOrdersCount = await this.orderModel.countDocuments();
      console.log('Total orders in database:', totalOrdersCount);      // Debug: Check orders for today without driver filter
      const todayOrdersGlobal = await this.orderModel.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      });
      console.log('Today orders (global):', todayOrdersGlobal);

      // If userId is provided, filter for driver-specific stats
      if (userId) {
        baseFilter.deliveryDriver = userId;
        todayFilter.deliveryDriver = userId;
      }

      // Parallel queries for better performance
      const [
        todayOrdersCount,
        activeDeliveriesCount,
        todayOrders,
        deliveryOrders,
        completedDeliveries
      ] = await Promise.all([
        // Total orders today
        this.orderModel.countDocuments(todayFilter),
        
        // Active deliveries (out for delivery or ready for delivery)
        this.orderModel.countDocuments({
          ...baseFilter,
          orderStatus: { 
            $in: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_DELIVERY] 
          }
        }),        // Today's orders with details for calculations
        this.orderModel
          .find(todayFilter)
          .select('totalAmount orderStatus createdAt updatedAt orderType positionHistory')
          .lean(),
        
        // Current delivery orders
        this.orderModel
          .find({
            ...baseFilter,
            orderType: OrderType.DELIVERY,
            orderStatus: { 
              $in: [
                OrderStatus.READY_FOR_DELIVERY, 
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.IN_PREPARATION,
                OrderStatus.PREPARED
              ] 
            }
          })
          .select('orderStatus')
          .lean(),
          // Completed deliveries today for time analysis
        this.orderModel
          .find({
            ...todayFilter,
            orderStatus: OrderStatus.DELIVERED,
            orderType: OrderType.DELIVERY
          })
          .select('createdAt updatedAt positionHistory')
          .lean()
      ]);

      // Calculate total revenue for today
      const totalRevenue = todayOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0), 
        0
      );

      // Calculate delivered orders today
      const deliveredToday = todayOrders.filter(
        order => order.orderStatus === OrderStatus.DELIVERED
      ).length;

      // Calculate completion rate (delivered vs total orders today)
      const completionRate = todayOrdersCount > 0 
        ? (deliveredToday / todayOrdersCount) * 100 
        : 0;

      // Calculate average order value
      const avgOrderValue = todayOrdersCount > 0 
        ? totalRevenue / todayOrdersCount 
        : 0;

      // Calculate average delivery time
      let averageDeliveryTime = 0;
      let onTimeDeliveries = 0;
        if (completedDeliveries.length > 0) {
        const deliveryTimes = completedDeliveries
          .map(order => {
            const createdAt = new Date(order.createdAt);
            const deliveredAt = new Date((order as any).updatedAt);
            const deliveryTime = (deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60); // in minutes
            
            // Count on-time deliveries (within 45 minutes)
            if (deliveryTime <= 45) {
              onTimeDeliveries++;
            }
            
            return deliveryTime;
          })
          .filter(time => time > 0 && time < 300); // Filter out invalid times (> 5 hours)

        if (deliveryTimes.length > 0) {
          averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
        }
      }

      // Calculate on-time delivery rate
      const onTimeDeliveryRate = completedDeliveries.length > 0 
        ? (onTimeDeliveries / completedDeliveries.length) * 100 
        : 0;

      // Count pending and in-progress orders
      const pendingOrders = deliveryOrders.filter(
        order => order.orderStatus === OrderStatus.READY_FOR_DELIVERY
      ).length;

      const inProgressOrders = deliveryOrders.filter(
        order => order.orderStatus === OrderStatus.OUT_FOR_DELIVERY
      ).length;

      const quickStats = {
        todayOrders: todayOrdersCount,
        activeDeliveries: activeDeliveriesCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        completionRate: Math.round(completionRate * 100) / 100,
        pendingOrders,
        inProgressOrders,
        deliveredToday,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
      };

      console.log('Quick stats calculated:', quickStats);
      return quickStats;

    } catch (error) {
      console.error('Error calculating quick stats:', error);
      throw new BadRequestException('Failed to calculate quick statistics');
    }
  }

}
