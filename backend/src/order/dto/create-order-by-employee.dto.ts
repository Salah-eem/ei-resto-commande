import {
    IsString,
    IsNotEmpty,
    IsEnum,
    ValidateNested,
    IsOptional,
    IsNumber,
    IsArray,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
  import { AddressDto } from 'src/address/dto/address.dto';
import { OrderItemDto } from './order-item.dto';
  
  // 👤 Infos du client quand c’est une commande prise par téléphone
  export class CustomerDto {
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @IsString()
    @IsNotEmpty()
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
  }
  