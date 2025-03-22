import { IsEnum, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderItem, OrderType, PaymentMethod, PaymentStatus } from 'src/schemas/order.schema';
import { AddressDto } from 'src/address/dto/address.dto';
import { CartItem } from 'src/schemas/cart.schema';

export class  CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(OrderType, { message: 'orderType must be pickup or delivery' })
  @Transform(({ value }) => value.toLowerCase())
  orderType: OrderType;

  @IsEnum(PaymentMethod, { message: 'paymentMethod must be card, paypal, or cash' })
  @Transform(({ value }) => value.toLowerCase())
  paymentMethod: PaymentMethod;
  
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress?: AddressDto;
}
