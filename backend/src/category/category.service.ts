import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Category } from 'src/schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {

    constructor(@InjectModel(Category.name) private readonly categoryModel: mongoose.Model<Category>) {}


    async getAll(): Promise<Category[]> {
        return await this.categoryModel.find().exec();
    }

    async findByName(name: string): Promise<Category | null> {
        return await this.categoryModel.findOne({name: name}).exec();
    }

    async findById(id: string): Promise<Category | null> {
        return await this.categoryModel.findOne({id: id}).exec();
    }
    
    async create(dto: CreateCategoryDto) { 
        const category = await this.findByName(dto.name);
        if(category) {
            throw new BadRequestException('Ctaegory must be unique.');
        }
        return await this.categoryModel.create(dto);
    }

    
    async delete(categoryId: string) {
        return await this.categoryModel.findByIdAndDelete(categoryId).exec();
    }

    async deleteAll() {
        return await this.categoryModel.deleteMany({}).exec();
    }
}
