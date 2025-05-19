import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { IsEmailUniqueConstraint } from './user/validator/email-validator';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { CartModule } from './cart/cart.module';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { DeliveryGateway } from './gateway/delivery.gateway';
import { RestaurantModule } from './restaurant/restaurant.module';
import { LiveOrdersGateway } from './gateway/live-orders.gateway';
import { CommonModule } from './common/common.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true
    }),
    MongooseModule.forRoot(process.env.DB_URI!),
    ScheduleModule.forRoot(),

    AuthModule,
    UserModule,
    ProductModule,
    CategoryModule,
    CartModule,
    PaymentModule,
    OrderModule,
    AddressModule,
    RestaurantModule,
    CommonModule,
  ],
  controllers: [],
    
  providers: [ DeliveryGateway, LiveOrdersGateway ],
})
export class AppModule {}
