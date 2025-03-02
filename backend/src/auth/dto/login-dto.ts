import { Module } from "@nestjs/common";
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

@Module({})
export class LoginDto {

    @IsNotEmpty()
    @IsEmail()
    email: string;
    
    @IsNotEmpty()
    password: string;
}