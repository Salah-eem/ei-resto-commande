import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Address, AddressSchema } from './address.schema';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ required: true, default: 3.99 })
  deliveryFee: number;

  @Prop({ required: false })
  phoneNumber?: string;

  @Prop({ required: false })
  logoUrl?: string;

  @Prop({ required: false })
  openingHours?: string; // Exemple: "09:00 - 22:00"

  @Prop({ required: false })
  description?: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
