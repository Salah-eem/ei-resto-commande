import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from 'src/schemas/product.schema';
import { CategorySchema } from 'src/schemas/category.schema';
import { OrderItemSchema } from 'src/schemas/order-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]),
    MongooseModule.forFeature([{ name: 'Category', schema: CategorySchema }]),
    MongooseModule.forFeature([{ name: 'OrderItem', schema: OrderItemSchema }]),
  ],
  providers: [ProductService],
  controllers: [ProductController]
})
export class ProductModule {}
