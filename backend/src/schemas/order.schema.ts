import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: [{ productId: String, name: String, price: Number, quantity: Number, size: String }] })
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
  }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'pending', enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] })
  status: string;

  @Prop({ type: String, enum: ['card', 'paypal'], required: true })
  paymentMethod: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ default: Date.now })
  paidAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
