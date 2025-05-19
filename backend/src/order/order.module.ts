import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schemas/order.schema';
import { CartSchema } from 'src/schemas/cart.schema';
import { LiveOrdersGateway } from 'src/gateway/live-orders.gateway';
import { UserSchema } from 'src/schemas/user.schema';
import { OrderItemSchema } from 'src/schemas/order-item.schema';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema}]),
            MongooseModule.forFeature([{ name: 'OrderItem', schema: OrderItemSchema}]),
            MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema}]),
            MongooseModule.forFeature([{ name: 'User', schema: UserSchema}])],
  providers: [
    OrderService, {
      provide: LiveOrdersGateway,
      useClass: LiveOrdersGateway,
    },
    LiveOrdersGateway,
    UserService,
  ],
  controllers: [OrderController],
  exports: [
    OrderService,
    LiveOrdersGateway,
  ],
})
export class OrderModule {}
