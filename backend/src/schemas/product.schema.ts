import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Category } from "./category.schema";
import { Types } from "mongoose";

@Schema({
    timestamps: true
})
export class Product {
    @Prop({ required: true})
    name: string;

    @Prop({ required: false})
    description: string;

    @Prop({ required: true})
    price: number;

    // Utilisation de ObjectId pour la référence vers la collection Category
    @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
    category: Category;

    @Prop({ required: true})
    stock: number;

    @Prop({ required: false})
    image_url: string;

   
}

export const ProductSchema = SchemaFactory.createForClass(Product);

