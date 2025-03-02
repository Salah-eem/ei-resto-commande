import { Module } from "@nestjs/common";
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import { Role } from "src/schemas/user.schema";


@Module({})
export class UserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
}