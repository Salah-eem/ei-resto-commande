import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
  PICKED_UP = 'picked_up',
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

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        size: { type: String, required: false },
        image_url: { type: String, required: false },
      },
    ],
  })
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    size?: string;
    image_url?: string;
  }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.IN_PROGRESS })
  orderStatus: OrderStatus;

  @Prop({ type: String, enum: Object.values(PaymentMethod), required: true })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: Object.values(OrderType), required: true })
  orderType: OrderType;
  
  @Prop({ type: Number, default: 30 }) // Duration in minutes
  estimatedDelivery: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  deliveryPosition: { lat: number; lng: number };

}

export const OrderSchema = SchemaFactory.createForClass(Order);

