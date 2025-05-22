import { IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUpdateIngredientDto {
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @IsNotEmpty()
    @IsNumber()
    stock: number;

    @IsOptional()
    @IsString()
    image_url?: string;

    @IsOptional()
    @IsString()
    description?: string;
}
