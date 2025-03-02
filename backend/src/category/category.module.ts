import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CategorySchema } from 'src/schemas/category.schema';
import { IsUniqueCategoryConstraint } from './validator/name-validator';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Category', schema: CategorySchema}])],
  controllers: [CategoryController],
  providers: [CategoryService, IsUniqueCategoryConstraint]
})
export class CategoryModule {}
