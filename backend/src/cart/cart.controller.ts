import { Controller, Post, Get, Body, Param, Patch, Delete, BadRequestException, UseGuards, Req, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@Public()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Obtenir le panier d'un utilisateur ou invité
  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getOrCreateCart(userId);
  }

  @Post('merge')
  @UseGuards(JwtGuard)
  async mergeCart(
    @GetUser() user: any,
    @Body('guestId') guestId: string,
  ) {
    const userId = user.userId;
    return this.cartService.mergeCart(guestId, userId);
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
