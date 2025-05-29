import { Module } from '@nestjs/common';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  Matches,
  MinLength,
} from 'class-validator';
import { Address } from 'src/schemas/address.schema';
import { Role } from 'src/schemas/user.schema';

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

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*\d)(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, {
    message:
      'Password must contain at least 8 char, 1 number, 1 capital letter and 1 special char.',
  })
  password: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  addresses?: Address[];

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  photoUrl?: string;
}
