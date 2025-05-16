import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderItemDocument = OrderItem & Document;

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ default: 0, required: false })
  preparedQuantity: number;    // ← nombre d’unités déjà préparées

  @Prop({ default: false, required: false })
  isPrepared: boolean;         // ← true quand preparedQuantity === quantity

  @Prop()
  size?: string;

  @Prop()
  image_url?: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
