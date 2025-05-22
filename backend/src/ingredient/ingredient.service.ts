import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ingredient, IngredientDocument } from 'src/schemas/ingredient.schema';
import { CreateUpdateIngredientDto } from './dto/create-update-ingredient.dto';

@Injectable()
export class IngredientService {

    constructor(@InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>) {}



    async getAll(): Promise<Ingredient[]> {
        return await this.ingredientModel.find().sort({ name: 1 }).exec();
    }

    async getByName(name: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findOne({ name }).exec();
    }

    async getById(id: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findById(id).exec();
    }

    async addIngredient(ingredientData: CreateUpdateIngredientDto): Promise<Ingredient> {
        const existingIngredient = await this.ingredientModel.findOne({ name: ingredientData.name }).exec();
        if (existingIngredient) {
            throw new BadRequestException('Ingredient with this name already exists.');
        }
        const newIngredient = new this.ingredientModel(ingredientData);
        return await newIngredient.save();
    }

    async updateIngredient(id: string, ingredientData: CreateUpdateIngredientDto): Promise<Ingredient | null> {
        const ingredient = await this.ingredientModel.findById(id).exec();
        if (!ingredient) {
            throw new BadRequestException('Ingredient not found');
        }
        if (!this.isNameUnique(ingredientData.name, id)) {
            throw new BadRequestException('Ingredient with this name already exists.');
        }
        return await this.ingredientModel.findByIdAndUpdate(id, ingredientData, { new: true }).exec();
    }

    async deleteIngredientById(id: string): Promise<Ingredient | null> {
        const ingredient = await this.ingredientModel.findById(id).exec();
        if (!ingredient) {
            throw new BadRequestException('Ingredient not found');
        }
        return await this.ingredientModel.findByIdAndDelete(id).exec();
    }

    async deleteIngredientByName(name: string): Promise<Ingredient | null> {
        const ingredient = await this.ingredientModel.findOne({ name }).exec();
        if (!ingredient) {
            throw new BadRequestException('Ingredient not found');
        }
        return await this.ingredientModel.findOneAndDelete({ name }).exec();
    }

    async deleteAllIngredients(): Promise<void> {
        await this.ingredientModel.deleteMany().exec();
    }

    async isNameUnique(name: string, ingredientId?: string): Promise<boolean> {
        // Normalise le nom pour ignorer majuscules et espaces
        const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
        const ingredient = await this.ingredientModel.findOne({
            $expr: {
                $and: [
                    { $ne: ['$_id', ingredientId ? ingredientId : null] },
                    { $eq: [
                        { $replaceAll: { input: { $toLower: { $trim: { input: '$name' } } }, find: '  ', replacement: ' ' } },
                        normalized
                    ] }
                ]
            }
        }).exec();
        return !ingredient;
    }

      async updateIngredientImage(
        ingredientId: string,
        imageUrl: string,
      ): Promise<Ingredient> {
        const updatedIngredient = await this.ingredientModel
          .findByIdAndUpdate(ingredientId, { image_url: imageUrl }, {
            new: true,
            runValidators: true,
          })
          .exec();

        if (!updatedIngredient) {
          throw new NotFoundException('Ingredient not found.');
        }
        return updatedIngredient;
      }

}
