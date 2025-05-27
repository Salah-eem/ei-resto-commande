import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IngredientDocument = Ingredient & Document;

@Schema({ timestamps: true })
export class Ingredient {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: false, default: null })
  stock?: number;

  @Prop({ required: false })
  image_url?: string;

  @Prop({ required: false })
  description?: string;

}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
