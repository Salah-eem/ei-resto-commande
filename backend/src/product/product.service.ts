import { Injectable } from '@nestjs/common';
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
    
}
