import { Module } from '@nestjs/common';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  Matches,
  MinLength,
} from 'class-validator';
import { IsNameUnique } from '../validator/name-validator';
import { IsEmailUnique } from '../validator/email-validator';

@Module({})
export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  //@IsEmailUnique()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*\d)(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, {
    message:
      'Password must contain at least 8 char, 1 number, 1 capital letter and 1 special char.',
  })
  password: string;

  @IsNotEmpty()
  @MinLength(3)
  firstName: string;

  @IsNotEmpty()
  @MinLength(3)
  //@IsNameUnique()
  lastName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
