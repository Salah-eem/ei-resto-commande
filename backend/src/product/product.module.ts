import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from 'src/schemas/product.schema';
import { CategorySchema } from 'src/schemas/category.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema}]),
            MongooseModule.forFeature([{ name: 'Category', schema: CategorySchema}])],
  providers: [ProductService],
  controllers: [ProductController]
})
export class ProductModule {}
