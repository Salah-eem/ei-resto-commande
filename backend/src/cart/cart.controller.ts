import { Controller, Post, Get, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtGuard } from '../auth/guard/jwt.guard';


@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Obtenir le panier d'un utilisateur
  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getOrCreateCart(userId);
  }

  // ✅ Ajouter un article
  @Post(':userId/add')
  async addItem(@Param('userId') userId: string, @Body() item: any) {
    return this.cartService.addItemToCart(userId, item);
  }

  // ✅ Mettre à jour la quantité
  @Patch(':userId/update')
  async updateQuantity(@Param('userId') userId: string, @Body() body: any) {
    const { productId, size, quantity } = body;
    return this.cartService.updateItemQuantity(userId, productId, size, quantity);
  }

  // ✅ Vider le panier
  @Delete(':userId/clear')
  async clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
