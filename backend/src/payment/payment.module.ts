import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schemas/order.schema';
import { CartSchema } from 'src/schemas/cart.schema';
import { OrderService } from 'src/order/order.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema}]),
            MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema}])],
  controllers: [PaymentController],
  providers: [PaymentService, OrderService]
})
export class PaymentModule {}
