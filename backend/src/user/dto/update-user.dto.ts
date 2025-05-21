import { IsEmail, IsOptional, IsPhoneNumber, MinLength, Validate } from "class-validator";
import { Role } from "src/schemas/user.schema";
import { UniqueFullName } from "../validator/unique-fullname.validator";

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @MinLength(8)
    password?: string;

    @IsOptional()
    @MinLength(3)
    @Validate(UniqueFullName, ['lastName'])
    firstName?: string;

    @IsOptional()
    @MinLength(3)
    lastName?: string;

    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @IsOptional()
    role?: Role;
}
