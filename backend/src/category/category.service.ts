import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Category } from 'src/schemas/category.schema';
import { CreateUpdateCategoryDto } from './dto/create-update-category.dto';

@Injectable()
export class CategoryService {

    constructor(@InjectModel(Category.name) private readonly categoryModel: mongoose.Model<Category>) {}


    async getAll(): Promise<Category[]> {
        return (await this.categoryModel.find().exec()).sort((a, b) => a.idx - b.idx);
    }

    async findByName(name: string): Promise<Category | null> {
        return await this.categoryModel.findOne({name: name}).exec();
    }

    async findById(id: string): Promise<Category | null> {
        return await this.categoryModel.findOne({id: id}).exec();
    }

    async create(dto: CreateUpdateCategoryDto) {
        const category = await this.findByName(dto.name);
        if(category) {
            throw new BadRequestException('Ctaegory must be unique.');
        }
        return await this.categoryModel.create(dto);
    }

    async update(categoryId: string, dto: CreateUpdateCategoryDto) {
        const category = await this.categoryModel.findById(categoryId).exec();
        if (!category) {
            throw new BadRequestException('Category not found.');
        }
        const existingCategory = await this.categoryModel.findOne({ name: dto.name }).exec();
        if (existingCategory && existingCategory._id.toString() !== categoryId) {
            throw new BadRequestException('Category name must be unique.');
        }
        return await this.categoryModel.findByIdAndUpdate(categoryId, dto, { new: true }).exec();
    }

    async delete(categoryId: string) {
        return await this.categoryModel.findByIdAndDelete(categoryId).exec();
    }

    async deleteAll() {
        return await this.categoryModel.deleteMany({}).exec();
    }

    async isNameUnique(name: string, catId?: string): Promise<boolean> {
      const category = await this.categoryModel
        .findOne({ name, _id: { $ne: catId } })
        .exec();
      return !category;
    }

    async isIdxUnique(idx: number, catId?: string): Promise<boolean> {
      const category = await this.categoryModel
        .findOne({ idx, _id: { $ne: catId } })
        .exec();
      return !category;
    }

    async reorderCategories(updates: { _id: string, idx: number }[]) {
        if (!Array.isArray(updates)) throw new BadRequestException('Invalid payload');
        // Pour éviter les conflits d'unicité, on met d'abord tous les idx à des valeurs temporaires
        const tempOps = updates.map((u, i) => ({
            updateOne: {
                filter: { _id: u._id },
                update: { $set: { idx: 10000 + i } }
            }
        }));
        await this.categoryModel.bulkWrite(tempOps);
        // Puis on applique les vrais idx
        const ops = updates.map(u => ({
            updateOne: {
                filter: { _id: u._id },
                update: { $set: { idx: u.idx } }
            }
        }));
        await this.categoryModel.bulkWrite(ops);
        return { success: true };
    }

}
