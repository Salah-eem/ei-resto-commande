import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({
    timestamps: true
})
export class Category {
    @Prop({ required: true, minlength: 3, unique: true})
    name: string;

    @Prop({ type: Number, required: true, unique: true })
    idx: number;

}

export const CategorySchema = SchemaFactory.createForClass(Category);

