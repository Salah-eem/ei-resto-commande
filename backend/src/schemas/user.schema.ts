import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Address } from "./address.schema";

export type UserDocument = User & Document;

export enum Role {
    Admin = 0, Employee = 1, Client = 2
}

@Schema({
    timestamps: true
})
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop()
    firstName: string;

    @Prop()
    lastName: string;

    @Prop( { required: false })
    phone: string;

    @Prop({ required: false, type: [Address] })
    addresses: Address[];

    @Prop({default: Role.Client})
    role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);

// le couple firstName et lastName doit etre unique
UserSchema.index({ firstName: 1, lastName: 1 }, { unique: true });
