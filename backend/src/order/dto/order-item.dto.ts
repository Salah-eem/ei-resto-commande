import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Category } from 'src/schemas/category.schema';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  category?: Category; 

  @IsOptional()
  image_url?: string;

  @IsOptional()
  liked?: boolean;
}
