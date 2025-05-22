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
    // Normalise le nom pour ignorer majuscules et espaces
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const matchId = prodId ? new mongoose.Types.ObjectId(prodId) : null;
    const product = await this.productModel.findOne({
      $expr: {
        $and: [
          matchId ? { $ne: ['$_id', matchId] } : {},
          {
            $eq: [
              {
                $replaceAll: {
                  input: { $replaceAll: { input: { $toLower: { $trim: { input: '$name' } } }, find: '  ', replacement: ' ' } },
                  find: '  ',
                  replacement: ' ',
                },
              },
              normalized,
            ],
          },
        ],
      },
    }).exec();
    return !product;
  }

  async updateProductImage(
    productId: string,
    imageUrl: string,
  ): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(productId, { image_url: imageUrl }, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found.');
    }
    return updatedProduct;
  }

  async getMostOrderedProducts(): Promise<any[]> {
    // Agrégation sur la collection OrderItem pour compter les quantités par produit
    const OrderItem = this.productModel.db.model('OrderItem');
    const pipeline: any[] = [
      { $group: { _id: "$productId", totalOrdered: { $sum: "$quantity" } } },
      { $sort: { totalOrdered: -1 } },
      { $limit: 7 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $addFields: { "product.totalOrdered": "$totalOrdered" } },
      { $replaceRoot: { newRoot: "$product" } }
    ];
    return OrderItem.aggregate(pipeline).exec();
  }

  /**
   * Retourne pour chaque produit :
   * - totalOrders: nombre total de commandes contenant ce produit
   * - totalLikes: nombre de fois où il a été liké
   * - likePercentage: pourcentage de likes sur le total
   */
  async getProductStats(): Promise<any[]> {
    const OrderItem = this.productModel.db.model('OrderItem');
    const pipeline: any[] = [
      {
        $group: {
          _id: "$productId",
          totalOrders: { $sum: 1 },
          totalLikes: { $sum: { $cond: ["$liked", 1, 0] } },
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $addFields: {
          likePercentage: {
            $cond: [
              { $eq: ["$totalOrders", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$totalLikes", "$totalOrders"] }, 100] }, 1] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          image_url: "$product.image_url",
          totalOrders: 1,
          totalLikes: 1,
          likePercentage: 1
        }
      }
    ];
    return OrderItem.aggregate(pipeline).exec();
  }

    async getProductIngredientsById(productId: string): Promise<any[]> {
        const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(productId) } },
        {
            $lookup: {
            from: 'ingredients',
            localField: 'ingredients',
            foreignField: '_id',
            as: 'ingredients',
            },
        },
        { $unwind: '$ingredients' },
        {
            $project: {
            _id: 0,
            name: 1,
            ingredients: {
                _id: '$ingredients._id',
                name: '$ingredients.name',
                stock: '$ingredients.stock',
                description: '$ingredients.description',
                image_url: '$ingredients.image_url',
            },
            },
        },
        ];
    
        return this.productModel.aggregate(pipeline).exec();
    }

    async deleteProductById(productId: string): Promise<Product | null> {
        const product = await this.productModel.findById(productId).exec();
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        return await this.productModel.findByIdAndDelete(productId).exec();
    }

}
