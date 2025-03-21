import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, PaymentMethod } from 'src/schemas/order.schema';
import { AddressDto } from 'src/address/dto/address.dto';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
