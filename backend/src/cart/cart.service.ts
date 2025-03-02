import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from '../schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {}

  // ✅ Créer un nouveau panier ou récupérer un panier existant
  async getOrCreateCart(userId: string): Promise<Cart> {
      // Vérifier si l'ID utilisateur est un ObjectId MongoDB valide
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
      await cart.save();
    }
    return cart;
  }

  // ✅ Ajouter un produit au panier
  async addItemToCart(userId: string, item: any): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((i) => i.productId === item.productId && i.size === item.size);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    return cart;
  }

  // ✅ Mettre à jour la quantité d'un article
  async updateItemQuantity(userId: string, productId: string, size: string, quantity: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.productId === productId && i.size === size);
    if (item) {
      item.quantity = quantity;
    }
    return cart;
  }

  // ✅ Vider le panier
  async clearCart(userId: string): Promise<void> {
    await this.cartModel.updateOne({ userId }, { items: [] });
  }
}
