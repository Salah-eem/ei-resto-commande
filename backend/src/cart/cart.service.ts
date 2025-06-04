import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  // ✅ Obtenir ou créer un panier pour un utilisateur ou un invité
  // Dans CartService…
  async getOrCreateCart(userId: string): Promise<any> {
    // On cherche (et on peuple) le panier existant
    let cartDoc = await this.cartModel
      .findOne({ userId })
      // .populate('items.productId') // on peuple chaque produit
      .populate('items.category') // on peuple chaque catégorie
      .populate('items.baseIngredients._id') // on peuple chaque baseIngredient
      .populate('items.ingredients._id') // on peuple chaque ingredient
      .exec();

    // Si pas de panier, on le crée
    if (!cartDoc) {
      cartDoc = new this.cartModel({ userId, items: [] });
      await cartDoc.save();
    }

    // On convertit en POJO pour manipuler facilement
    const cart = cartDoc.toObject({ virtuals: false });

    // Pour chaque item, on reconstruit ses listes d'ingrédients
    cart.items = (cart.items || []).map((item: any) => {
      // 1. Traiter les baseIngredients
      const baseIngredients = (item.baseIngredients || []).map((b: any) => {
        // Si b._id est un objet (document Ingredient peuplé)
        if (b._id && typeof b._id === 'object' && b._id._id) {
          // On clone toutes les propriétés du document peuplé
          const ingrObj: any = { ...b._id };
          // Forcer _id en string
          ingrObj._id = b._id._id.toString();
          // On ajoute la quantité
          ingrObj.quantity = typeof b.quantity === 'number' ? b.quantity : 1;
          return ingrObj;
        } else {
          // Pas peuplé, on renvoie juste l’ID + quantité
          return {
            _id: b._id?.toString() ?? b._id,
            quantity: typeof b.quantity === 'number' ? b.quantity : 1,
          };
        }
      });

      // 2. Traiter les ingredients « personnalisés » de la même manière
      const ingredients = (item.ingredients || []).map((b: any) => {
        if (b._id && typeof b._id === 'object' && b._id._id) {
          const ingrObj: any = { ...b._id };
          ingrObj._id = b._id._id.toString();
          ingrObj.quantity = typeof b.quantity === 'number' ? b.quantity : 1;
          return ingrObj;
        } else {
          return {
            _id: b._id?.toString() ?? b._id,
            quantity: typeof b.quantity === 'number' ? b.quantity : 1,
          };
        }
      });

      // 3. On retourne l’item avec ses listes corrigées
      return {
        ...item,
        baseIngredients,
        ingredients,
      };
    });

    return cart;
  }

  // ✅ Ajouter un article au panier
  async addItemToCart(userId: string, item: any): Promise<any> {
    if (!item.productId || !item.name || !item.price || !item.quantity) {
      throw new BadRequestException(
        '❌ Données invalides. Assurez-vous que productId, name, price et quantity sont présents.',
      );
    }

    // Correction stricte : S'assurer que baseIngredients et ingredients sont bien des tableaux d'objets {_id, quantity} et que la quantité envoyée est bien conservée
    if (item.baseIngredients && Array.isArray(item.baseIngredients)) {
      item.baseIngredients = item.baseIngredients.map((ing: any) => {
        // Prend la quantité envoyée, même si l'objet contient d'autres propriétés (ingredient, etc.)
        const id = ing._id || (typeof ing === 'object' ? ing._id : ing);
        const quantity =
          typeof ing.quantity === 'number' && !isNaN(ing.quantity)
            ? ing.quantity
            : 1;
        return { _id: id, quantity };
      });
    } else {
      item.baseIngredients = [];
    }
    if (item.ingredients && Array.isArray(item.ingredients)) {
      item.ingredients = item.ingredients.map((ing: any) => {
        const id = ing._id || (typeof ing === 'object' ? ing._id : ing);
        const quantity =
          typeof ing.quantity === 'number' && !isNaN(ing.quantity)
            ? ing.quantity
            : 1;
        return { _id: id, quantity };
      });
    } else {
      item.ingredients = [];
    }

    // Utilise le document Mongoose pour la modification et la sauvegarde
    let cartDoc = await this.cartModel.findOne({ userId });
    if (!cartDoc) {
      cartDoc = new this.cartModel({ userId, items: [] });
      await cartDoc.save();
    }

    // Nouvelle logique : distinguer les items par leur composition d'ingrédients (base et personnalisés)
    // Nouvelle version : comparer la composition complète (ingrédients + quantités)
    const isSameComposition = (a: any, b: any) => {
      if (a.size !== b.size) return false;
      // Compare baseIngredients (juste les ids, triés)
      const aBase = (a.baseIngredients || [])
        .map((i: any) => i.toString())
        .sort()
        .join(',');
      const bBase = (b.baseIngredients || [])
        .map((i: any) => i.toString())
        .sort()
        .join(',');
      if (aBase !== bBase) return false;
      // Compare ingredients (ids + quantités, triés)
      const serializeIngredients = (ings: any[] = []) =>
        ings
          .map(
            (i) =>
              `${i._id ? i._id.toString() : i.toString()}:${i.quantity || 1}`,
          )
          .sort()
          .join(',');
      const aIngs = serializeIngredients(a.ingredients);
      const bIngs = serializeIngredients(b.ingredients);
      return aIngs === bIngs;
    };

    const existingItem = cartDoc.items.find(
      (i: any) => i.productId === item.productId && isSameComposition(i, item),
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
      // Fusionne et additionne les quantités de chaque ingrédient (baseIngredients)
      if (existingItem.baseIngredients && item.baseIngredients) {
        const baseMap = new Map(
          existingItem.baseIngredients.map((ing: any) => [
            ing._id.toString(),
            ing,
          ]),
        );
        item.baseIngredients.forEach((ing: any) => {
          const key = ing._id.toString();
          if (baseMap.has(key)) {
            baseMap.get(key).quantity += ing.quantity;
          } else {
            baseMap.set(key, { ...ing });
          }
        });
        existingItem.baseIngredients = Array.from(baseMap.values());
      }
      // Fusionne et additionne les quantités de chaque ingrédient (ingredients)
      if (existingItem.ingredients && item.ingredients) {
        const ingMap = new Map(
          existingItem.ingredients.map((ing: any) => [ing._id.toString(), ing]),
        );
        item.ingredients.forEach((ing: any) => {
          const key = ing._id.toString();
          if (ingMap.has(key)) {
            ingMap.get(key).quantity += ing.quantity;
          } else {
            ingMap.set(key, { ...ing });
          }
        });
        existingItem.ingredients = Array.from(ingMap.values());
      }
    } else {
      cartDoc.items.push(item);
    }

    await cartDoc.save();
    return this.getOrCreateCart(userId); // Pour retourner les ingrédients peuplés
  }

  // ✅ Modifier la quantité d’un produit dans le panier
  async updateItemQuantity(
    userId: string,
    productId: string,
    size: string | undefined,
    quantity: number,
    ingredients?: any[],
  ): Promise<any> {
    // 1) On récupère le document Mongoose du panier (pas le POJO)
    const cartDoc = await this.cartModel.findOne({ userId });
    if (!cartDoc) {
      throw new NotFoundException('Panier non trouvé.');
    }

    // 2) Fonction utilitaire pour sérialiser une liste d’ingrédients { _id, quantity }
    const serializeIngredients = (ings: any[] = []) =>
      ings
        .map(i => `${i._id.toString()}:${i.quantity || 1}`)
        .sort()
        .join(',');

    // 3) On cherche l’item exact dans cartDoc.items
    const itemIndex = cartDoc.items.findIndex(docItem => {
      const sameProduct = docItem.productId === productId;
      const sameSize = docItem.size === size;
      // Sérialise docItem.ingredients (objets Mongoose) avant de comparer
      const docSerialized = serializeIngredients(
        (docItem.ingredients || []).map(i => ({
          _id: (i._id as Types.ObjectId).toString(),
          quantity: i.quantity,
        }))
      );
      const targetSerialized = serializeIngredients(ingredients || []);
      return sameProduct && sameSize && docSerialized === targetSerialized;
    });

    if (itemIndex === -1) {
      throw new NotFoundException('Article non trouvé dans le panier.');
    }

    // 4) On met à jour la quantité sur le document Mongoose
    cartDoc.items[itemIndex].quantity = quantity;

    // 5) On enregistre et on retourne la version POJO avec ingrédients peuplés
    await cartDoc.save();
    return this.getOrCreateCart(userId);
  }

  // ✅ Supprimer un article du panier
  async removeItemFromCart(userId: string, itemId: string): Promise<any> {
    const cartDoc = await this.cartModel.findOne({ userId });
    if (!cartDoc) {
      throw new NotFoundException('Panier non trouvé.');
    }

    cartDoc.items = cartDoc.items.filter(i => i._id.toString() !== itemId);

    await cartDoc.save();
    return this.getOrCreateCart(userId);
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
      return this.getOrCreateCart(userId); // Pour retourner les ingrédients peuplés
    } else if (guestCart && userCart) {
      // Si l'utilisateur a déjà un panier, fusionner les articles
      guestCart.items.forEach((guestItem) => {
        const userItem = userCart.items.find(
          (item) =>
            item.productId.toString() === guestItem.productId.toString() &&
            item.size === guestItem.size,
        );
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
      return this.getOrCreateCart(userId); // Pour retourner les ingrédients peuplés
    }
    // Si aucun panier invité n'existe, on retourne simplement le panier utilisateur (ou un panier vide)
    return this.getOrCreateCart(userId);
  }

  // ✅ Vider le panier
  async clearCart(userId: string): Promise<any> {
    const cartDoc = await this.cartModel.findOne({ userId });
    if (!cartDoc) {
      throw new NotFoundException('Panier non trouvé.');
    }

    cartDoc.items = [];
    await cartDoc.save();
    return this.getOrCreateCart(userId); // Pour retourner un panier vide
  }
}
