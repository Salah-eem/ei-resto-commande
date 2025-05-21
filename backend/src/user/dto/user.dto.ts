import { Module } from "@nestjs/common";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, MinLength } from "class-validator";
import { Address } from "src/schemas/address.schema";
import { Role } from "src/schemas/user.schema";


@Module({})
export class UserDto {
    @IsNotEmpty()
    @MinLength(3)
    firstName: string;

    @IsNotEmpty()
    @MinLength(3)
    lastName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @IsOptional()
    addresses?: Address[];

    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;
}