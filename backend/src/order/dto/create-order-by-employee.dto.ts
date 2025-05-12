import {
    IsEnum,
    IsOptional,
    ValidateNested,
    IsString,
    IsArray,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  import {
    OrderItem,
    OrderType,
    PaymentMethod,
    PaymentStatus,
  } from '../../schemas/order.schema';
  import { AddressDto } from '../../address/dto/address.dto';
import { OrderItemDto } from './order-item.dto';
  
  export class CreateOrderByEmployeeDto {
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
  
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    @IsOptional()
    items: OrderItemDto[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    deliveryAddress?: AddressDto;
  }
  