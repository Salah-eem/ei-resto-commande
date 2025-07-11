import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address, AddressSchema } from './address.schema';
import { OrderItem } from './order-item.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  CONFIRMED = 'confirmed',
  SCHEDULED = 'scheduled',
  IN_PREPARATION = 'in preparation',
  PREPARED = 'prepared',
  READY_FOR_PICKUP = 'ready for pickup',
  READY_FOR_DELIVERY = 'ready for delivery',
  PICKED_UP = 'picked up',
  OUT_FOR_DELIVERY = 'out for delivery',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CARD = 'card',
  PAYPAL = 'paypal',
  CASH = 'cash',
}

export enum OrderType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

@Schema({ _id: false })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ type: String, default: 'online' })
  source: string;

  @Prop({ type: Customer, required: false })
  customer?: Customer;

  // @Prop({ type: [OrderItem] })
  // items: OrderItem[];

  @Prop({ type: [Types.ObjectId], ref: 'OrderItem' })
  items: Types.ObjectId[];


  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.IN_PREPARATION })
  orderStatus: OrderStatus;

  @Prop({ type: String, enum: Object.values(PaymentMethod), required: true })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: Object.values(OrderType), required: true })
  orderType: OrderType;

  @Prop({
    type: AddressSchema,
    required: false,
    default: null,
  })
  deliveryAddress?: Address | null;

  @Prop({
    type: [
      {
        type: AddressSchema,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  positionHistory: (Address & { timestamp: Date })[];

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
    },
    default: null,
  })
  lastDeliveryPosition: { lat: number; lng: number; timestamp: Date } | null;

  @Prop({ type: Date, default: null })
  lastPositionUpdate: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, required: false, default: null })
  scheduledFor?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  deliveryDriver?: Types.ObjectId | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
