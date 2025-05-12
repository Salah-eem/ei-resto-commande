import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderItem, OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
import { AddressDto } from 'src/address/dto/address.dto';
import { CartItem } from 'src/schemas/cart.schema';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(OrderType)
  @Transform(({ value }) => value.toLowerCase())
  orderType: OrderType;

  @IsEnum(PaymentMethod)
  @Transform(({ value }) => value.toLowerCase())
  paymentMethod: PaymentMethod;

  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress?: AddressDto;
}