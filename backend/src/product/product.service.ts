import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Product } from 'src/schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {

    constructor(@InjectModel(Product.name) private readonly productModel: mongoose.Model<Product>) {}

    async getAll(): Promise<Product[]> {
        return await this.productModel.find().populate('category').exec();
    }

    async create(dto: CreateProductDto) { 
        const imageUrl = "images/"+dto.name.toLowerCase()+".png";
        const newProduct = new this.productModel({
            ...dto,
            category: new mongoose.Types.ObjectId(dto.category),
            image_url: imageUrl,
        });
        await newProduct.save();

        return newProduct;
    }

    async updateProduct(productId: string, updateData: Partial<Product>): Promise<Product> {
        const updatedProduct = await this.productModel.findByIdAndUpdate(
          productId,
          updateData,
          { new: true, runValidators: true }
        ).exec();
    
        if (!updatedProduct) {
          throw new NotFoundException('Product not found.');
        }
        return updatedProduct;
      }
    
   // ✅ Mettre à jour TOUS les produits
  async updateAllProducts(updateData: Partial<Product>): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.productModel.updateMany({}, { $set: updateData }).exec();
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      throw new BadRequestException("Erreur lors de la mise à jour des produits");
    }
  }
  
}
