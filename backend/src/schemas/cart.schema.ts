import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true })
  userId: string; // L'ID de l'utilisateur associé au panier

  @Prop([
    {
      productId: String,
      name: String,
      size: String,
      price: Number,
      quantity: Number,
    }
  ])
  items: Array<{
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
  }>;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
