import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  // ✅ Obtenir ou créer un panier pour un utilisateur ou un invité
  async getOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
      await cart.save();
    }
    return cart;
  }

  // ✅ Ajouter un article au panier
  async addItemToCart(userId: string, item: any): Promise<CartDocument> {
    if (!item.productId || !item.name || !item.price || !item.quantity) {
      throw new BadRequestException("❌ Données invalides. Assurez-vous que productId, name, price et quantity sont présents.");
    }
  
    const cart = await this.getOrCreateCart(userId);
  
    const existingItem = cart.items.find(
      (i) => i.productId === item.productId && i.size === item.size
    );
  
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }
  
    await cart.save();
    return cart;
  }
  

  // ✅ Modifier la quantité d’un produit dans le panier
  async updateItemQuantity(userId: string, productId: string, size: string | undefined, quantity: number): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);

    const item = cart.items.find((i) => i.productId === productId && i.size === size);

    if (!item) {
      throw new NotFoundException('Article non trouvé dans le panier.');
    }

    item.quantity = quantity;

    await cart.save();
    return cart;
  }

  // ✅ Supprimer un article du panier
  async removeItemFromCart(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);

    cart.items = cart.items.filter((i) => i.productId !== productId);

    await cart.save();
    return cart;
  }

  // ✅ Fusionner le panier d'un invité avec le panier d'un utilisateur connecté
  async mergeCart(guestId: string, userId: string): Promise<Cart> {
    // Récupérer le panier de l'invité et le panier de l'utilisateur
    const guestCart = await this.cartModel.findOne({ userId: guestId });
    let userCart = await this.cartModel.findOne({ userId });
    
    if (!userCart && guestCart) {
      // Si l'utilisateur n'a pas de panier, réattribuer le panier invité à l'utilisateur
      guestCart.userId = userId;
      await guestCart.save();
      return guestCart;
    } else if (guestCart && userCart) {
      // Si l'utilisateur a déjà un panier, fusionner les articles
      guestCart.items.forEach(guestItem => {
        const userItem = userCart.items.find(item => item.productId.toString() === guestItem.productId.toString());
        if (userItem) {
          // Additionner les quantités
          userItem.quantity += guestItem.quantity;
        } else {
          // Ajouter l'article du panier invité
          userCart.items.push(guestItem);
        }
      });
      await userCart.save();
      // Optionnel : Supprimer le panier invité
      await this.cartModel.deleteOne({ userId: guestId });
      return userCart;
    }
    // Si aucun panier invité n'existe, on retourne simplement le panier utilisateur (ou un panier vide)
    return userCart!;
  }
}
