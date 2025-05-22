import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Product } from 'src/schemas/product.schema';
import { CreateUpdateProductDto } from './dto/create-update-product.dto';
import { Category } from 'src/schemas/category.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: mongoose.Model<Product>,
    @InjectModel(Category.name)
    private readonly categoryModel: mongoose.Model<Category>,
  ) {}

  async getAll(): Promise<Product[]> {
    return await this.productModel.find().populate('category').exec();
  }

  async create(dto: CreateUpdateProductDto) {
    const imageUrl = 'images/' + dto.name.toLowerCase() + '.png';
    if (dto.category) {
      const category = await this.categoryModel
        .findById(dto.category)
        .exec();
      if (!category) {
        throw new BadRequestException('Category not found.');
      }
    }
    const newProduct = new this.productModel({
      ...dto,
      category: dto.category, // Id de la catégorie
      image_url: imageUrl,
    });
    await newProduct.save();

    return newProduct;
  }

  async updateProduct(
    productId: string,
    updateData: CreateUpdateProductDto,
  ): Promise<Product> {
    if (!updateData.stock) {
      updateData.stock = null;
    }
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found.');
    }
    return updatedProduct;
  }

  // ✅ Mettre à jour TOUS les produits
  async updateAllProducts(
    updateData: Partial<Product>,
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.productModel
        .updateMany({}, { $set: updateData })
        .exec();
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la mise à jour des produits',
      );
    }
  }

  async isNameUnique(name: string, prodId?: string): Promise<boolean> {
    const product = await this.productModel
      .findOne({ name, _id: { $ne: prodId } })
      .exec();
    return !product;
  }
}
