import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from './category.schema';

export enum ProductType {
  SINGLE_PRICE = 'single_price', // Produits sans tailles (ex: Boissons, Desserts)
  MULTIPLE_SIZES = 'multiple_sizes', // Produits avec tailles (ex: Pizzas)
}

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Category; // Référence vers la catégorie

  @Prop()
  image_url: string;

  @Prop({ required: true })
  stock: number;

  @Prop({ required: true, enum: ProductType })
  productType: ProductType; // Détermine si le produit a des tailles ou pas

  @Prop({ required: false, default: null })
  basePrice?: number; // Prix unique pour SINGLE_PRICE

  @Prop({
    type: [{ name: String, price: Number }],
    required: false,
    default: null, // Utilisé seulement si `productType === MULTIPLE_SIZES`
  })
  sizes?: { name: string; price: number }[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
