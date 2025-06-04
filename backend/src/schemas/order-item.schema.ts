import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  IngredientWithQuantity,
  IngredientWithQuantitySchema,
} from './ingredient-with-quantity.schema';

export type OrderItemDocument = OrderItem & Document;

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  /** Nom du produit “gelé” au moment de la commande */
  @Prop({ required: true })
  name: string;

  /** Prix du produit “gelé” au moment de la commande */
  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ default: 0, required: false })
  preparedQuantity: number;

  @Prop({ default: false, required: false })
  isPrepared: boolean;

  @Prop()
  size?: string;

  @Prop()
  image_url?: string;

  @Prop({ default: false })
  liked?: boolean;

  /** Catégorie “gelée” du produit */
  @Prop({
    type: {
      _id: { type: Types.ObjectId, ref: 'Category', required: true },
      name: { type: String, required: true },
      idx: { type: Number, required: true },
    },
    required: true,
  })
  category: {
    _id: Types.ObjectId;
    name: string;
    idx: number;
  };

  /**
   * Snapshot des ingrédients de base (ceux fournis par défaut dans la recette),
   * chacun avec { _id, name, unitPrice, quantity }.
   */
  @Prop({ type: [IngredientWithQuantitySchema], default: [] })
  baseIngredientsSnapshot: IngredientWithQuantity[];

  /**
   * Snapshot des extras (ingrédients additionnels) à facturer,
   * chacun avec { _id, name, unitPrice, quantity }.
   */
  @Prop({ type: [IngredientWithQuantitySchema], default: [] })
  extraIngredientsSnapshot: IngredientWithQuantity[];
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
