import { Controller, Post, Get, Body, Param, Patch, Delete, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Obtenir le panier d'un utilisateur ou invité
  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getOrCreateCart(userId);
  }

  // ✅ Ajouter un article au panier
  @Post(':userId/add')
  async addItem(@Param('userId') userId: string, @Body() item: any) {
    if (!item.productId) {
      throw new BadRequestException('❌ productId est requis.');
    }
    return this.cartService.addItemToCart(userId, item);
  }
  

  // ✅ Modifier la quantité d’un produit dans le panier
  @Patch(':userId/update')
  async updateQuantity(@Param('userId') userId: string, @Body() body: any) {
    const { productId, size, quantity } = body;
    return this.cartService.updateItemQuantity(userId, productId, size, quantity);
  }

  // ✅ Supprimer un article du panier
  @Delete(':userId/:productId')
  async removeItem(@Param('userId') userId: string, @Param('productId') productId: string) {
    return this.cartService.removeItemFromCart(userId, productId);
  }
}
