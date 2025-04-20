import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Address, AddressSchema } from './address.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  CONFIRMED = 'confirmed',
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


@Schema()
export class OrderItem {
  @Prop({ required: true })
  productId: string; 

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  size?: string; 
  @Prop()
  image_url?: string;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: [OrderItem],})
  items: OrderItem[];

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

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  // 📍 Position actuelle du livreur (latitude & longitude)
  @Prop({
    type: AddressSchema,
    required: false, // Toujours facultatif pour deliveryPosition (parce que le livreur peut ne pas avoir encore commencé)
    default: null,
  })
  deliveryAddress: Address | null;

  // 📅 Historique des positions (facultatif, utile pour traçabilité)
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

  // 🔄 Dernière mise à jour de la position
  @Prop({ type: Date, default: null })
  lastPositionUpdate: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
