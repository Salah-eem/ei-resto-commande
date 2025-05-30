import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema()
export class Address extends Document {
  @Prop({ required: false })
  lat: number;

  @Prop({ required: false })
  lng: number;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  streetNumber: number;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
