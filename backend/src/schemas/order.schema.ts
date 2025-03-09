import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;


export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
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
  items: Record<string, any>[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
