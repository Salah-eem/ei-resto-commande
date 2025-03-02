import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({
    timestamps: true
})
export class Category {
    @Prop({ required: true, minlength: 3, unique: true})
    name: string;

}

export const CategorySchema = SchemaFactory.createForClass(Category);

