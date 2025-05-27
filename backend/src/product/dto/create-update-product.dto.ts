import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, ValidateNested, IsArray, ArrayNotEmpty, MinLength, Min, ValidateIf, IsMongoId, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from 'src/schemas/product.schema';
import { Category } from 'src/schemas/category.schema';

// Custom validator for unique product name
import { Injectable } from '@nestjs/common';
import { ProductService } from '../product.service';

export function IsProductNameUnique(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isProductNameUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          const dto: any = args.object;
          // On update, pass id to exclude
          const service: ProductService = (global as any).productServiceInstance;
          if (!service) return true; // fallback: skip
          return await service.isNameUnique(value, dto._id);
        },
        defaultMessage() {
          return 'Product name must be unique';
        },
      },
      async: true,
    });
  };
}

class SizeDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Size name must be at least 3 characters' })
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price: number;
}

export class CreateUpdateProductDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @IsProductNameUnique({ message: 'Product name must be unique' })
  readonly name: string;

  @IsOptional()
  @IsString()
  @ValidateIf(o => o.description && o.description.length > 0)
  @MinLength(3, { message: 'Description must be at least 3 characters' })
  readonly description?: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId({ message: 'Category must be a valid id' })
  readonly category: string;

  @IsOptional()
  @IsNumber()
  stock?: number | null;

  @IsOptional()
  @IsString()
  readonly image_url?: string;

  @IsNotEmpty()
  @IsEnum(ProductType)
  readonly productType: ProductType;

  @ValidateIf(o => o.productType === ProductType.SINGLE_PRICE)
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  readonly basePrice?: number;

  @ValidateIf(o => o.productType === ProductType.MULTIPLE_SIZES)
  @IsArray()
  @ArrayNotEmpty({ message: 'At least two sizes are required' })
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  readonly sizes?: SizeDto[];
}
