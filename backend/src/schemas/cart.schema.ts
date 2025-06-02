import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

// Subdocument for ingredient with quantity
@Schema()
export class IngredientWithQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  _id: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  quantity: number;
}

export const IngredientWithQuantitySchema = SchemaFactory.createForClass(IngredientWithQuantity);

@Schema()
export class CartItem {
  _id: Types.ObjectId;
  
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

  // Ajout pour la personnalisation
  @Prop({ type: [IngredientWithQuantitySchema], default: [] })
  baseIngredients: IngredientWithQuantity[];

  @Prop({ type: [IngredientWithQuantitySchema], default: [] })
  ingredients: IngredientWithQuantity[];
}

@Schema({ timestamps: true }) // Pour suivre `createdAt` et `updatedAt`
export class Cart {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
