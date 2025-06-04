import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IngredientWithQuantityDocument = IngredientWithQuantity & Document;

/**
 * On change ce schéma pour capturer, au moment de la commande :
 *   - l’_id d’origine (pour la traçabilité)
 *   - le name tel qu’il était (copié dans l’instant)
 *   - le unitPrice tel qu’il était (copié dans l’instant)
 *   - la quantité souhaitée
 */
@Schema()
export class IngredientWithQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, default: 1 })
  quantity: number;
}

export const IngredientWithQuantitySchema =
  SchemaFactory.createForClass(IngredientWithQuantity);
