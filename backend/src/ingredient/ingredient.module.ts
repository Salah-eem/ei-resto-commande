import { Module } from '@nestjs/common';
import { IngredientService } from './ingredient.service';
import { IngredientController } from './ingredient.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { IngredientSchema } from 'src/schemas/ingredient.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Ingredient', schema: IngredientSchema }])],
  providers: [IngredientService],
  controllers: [IngredientController]
})
export class IngredientModule {}
