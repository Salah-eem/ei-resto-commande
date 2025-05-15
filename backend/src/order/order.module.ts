import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schemas/order.schema';
import { CartSchema } from 'src/schemas/cart.schema';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';
import { UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema}]),
            MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema}]),
            MongooseModule.forFeature([{ name: 'User', schema: UserSchema}])],
  providers: [OrderService, LiveOrdersGateway],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
