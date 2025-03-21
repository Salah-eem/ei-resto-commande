import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schemas/order.schema';
import { CartSchema } from 'src/schemas/cart.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema}]),
            MongooseModule.forFeature([{ name: 'Cart', schema: CartSchema}])],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
