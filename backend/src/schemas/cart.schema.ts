import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ required: true })
  productId: string; 

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  size?: string; // Optionnel  
  @Prop()
  image_url?: string; // Optionnel
}

@Schema({ timestamps: true }) // Pour suivre `createdAt` et `updatedAt`
export class Cart {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
