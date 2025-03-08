import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, ValidateNested, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from 'src/schemas/product.schema';

class SizeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsNotEmpty()
  @IsString()
  readonly category: string;

  @IsNotEmpty()
  @IsNumber()
  readonly stock: number;

  @IsOptional()
  @IsString()
  readonly image_url?: string;

  @IsNotEmpty()
  @IsEnum(ProductType)
  readonly productType: ProductType;

  // ✅ Base price pour les produits sans tailles
  @IsOptional()
  @IsNumber()
  readonly basePrice?: number;

  // ✅ Liste des tailles pour les produits avec tailles
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  @ArrayNotEmpty()
  readonly sizes?: SizeDto[];
}
