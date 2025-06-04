import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IngredientWithQuantity, IngredientWithQuantitySchema } from './ingredient-with-quantity.schema';

export type CartIngredientWithQuantityDocument = CartIngredientWithQuantity & Document;

@Schema()
export class CartIngredientWithQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  _id: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  quantity: number;
}

export const CartIngredientWithQuantitySchema =
  SchemaFactory.createForClass(CartIngredientWithQuantity);

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  _id: Types.ObjectId;
  
  @Prop({ required: true })
  productId: string; 

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

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

  // Ajout pour la personnalisation
  @Prop({ type: [CartIngredientWithQuantitySchema], default: [] })
  baseIngredients: CartIngredientWithQuantity[];

  @Prop({ type: [CartIngredientWithQuantitySchema], default: [] })
  ingredients: CartIngredientWithQuantity[];
}

@Schema({ timestamps: true }) // Pour suivre `createdAt` et `updatedAt`
export class Cart {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
