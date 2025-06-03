import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema()
export class IngredientWithQuantity {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  _id: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  quantity: number;
}

export const IngredientWithQuantitySchema = SchemaFactory.createForClass(IngredientWithQuantity);
