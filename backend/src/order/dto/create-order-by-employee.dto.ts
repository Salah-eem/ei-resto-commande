import {
    IsString,
    IsNotEmpty,
    IsEnum,
    ValidateNested,
    IsOptional,
    IsNumber,
    IsArray,
    IsPhoneNumber,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
  import { AddressDto } from 'src/address/dto/address.dto';
import { OrderItemDto } from './order-item.dto';
  
  export class CustomerDto {
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber()
    phone: string;
  }
  
  // 🧾 DTO pour une commande passée par un employé
  export class CreateOrderByEmployeeDto {
    @ValidateNested()
    @Type(() => CustomerDto)
    customer: CustomerDto;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];
  
    @IsEnum(OrderType)
    orderType: OrderType;
  
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
  
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    deliveryAddress?: AddressDto;

    @IsOptional()
    scheduledFor?: string | null; // Date ISO string
  }
  