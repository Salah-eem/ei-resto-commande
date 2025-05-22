import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ingredient, IngredientDocument } from 'src/schemas/ingredient.schema';
import { CreateUpdateIngredientDto } from './dto/create-update-ingredient.dto';

@Injectable()
export class IngredientService {

    constructor(@InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>) {}



    async getAll(): Promise<Ingredient[]> {
        return await this.ingredientModel.find().exec();
    }

    async getByName(name: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findOne({ name }).exec();
    }

    async getById(id: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findById(id).exec();
    }

    async addIngredient(ingredientData: CreateUpdateIngredientDto): Promise<Ingredient> {
        const newIngredient = new this.ingredientModel(ingredientData);
        return await newIngredient.save();
    }

    async updateIngredient(id: string, ingredientData: CreateUpdateIngredientDto): Promise<Ingredient | null> {
        return await this.ingredientModel.findByIdAndUpdate(id, ingredientData, { new: true }).exec();
    }

    async deleteIngredientById(id: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findByIdAndDelete(id).exec();
    }

    async deleteIngredientByName(name: string): Promise<Ingredient | null> {
        return await this.ingredientModel.findOneAndDelete({ name }).exec();
    }

    async deleteAllIngredients(): Promise<void> {
        await this.ingredientModel.deleteMany().exec();
    }

    async isNameUnique(name: string, ingredientId?: string): Promise<boolean> {
        const ingredient = await this.ingredientModel
            .findOne({ name, _id: { $ne: ingredientId } })
            .exec();
        return !ingredient;
    }

}
