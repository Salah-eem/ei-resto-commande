import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schemas/order.schema';
import { CartSchema } from 'src/schemas/cart.schema';
import { OrderService } from 'src/order/order.service';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';
import { UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema}]),
            MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema}]),
            MongooseModule.forFeature([{ name: 'User', schema: UserSchema}])],
  controllers: [PaymentController],
  providers: [PaymentService, OrderService, LiveOrdersGateway]
})
export class PaymentModule {}
