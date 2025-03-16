import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export enum Role {
    Admin = 0, Employee = 1, Client = 2
}

@Schema({
    timestamps: true
})
export class User {
    @Prop()
    _id: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop()
    firstName: string;

    @Prop()
    lastName: string;

    @Prop({default: Role.Client})
    role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);

// le couple firstName et lastName doit etre unique
UserSchema.index({ firstName: 1, lastName: 1 }, { unique: true });
