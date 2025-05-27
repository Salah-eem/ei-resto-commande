import { Controller, Post, Get, Body, Param, Patch, Delete, BadRequestException, Req, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Obtenir le panier d'un utilisateur ou invité
  @Public()
  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getOrCreateCart(userId);
  }

  @Post('merge')
  async mergeCart(
    @GetUser() user: any,
    @Body('guestId') guestId: string,
  ) {
    console.log('user', user);
    if (user?.userId) {
      return this.cartService.mergeCart(guestId, user.userId);
    }
    throw new BadRequestException('❌ cannot get connected user');
  }

  // ✅ Ajouter un article au panier
  @Public()
  @Post(':userId/add')
  async addItem(@Param('userId') userId: string, @Body() item: any) {
    if (!item.productId) {
      throw new BadRequestException('❌ productId est requis.');
    }
    return this.cartService.addItemToCart(userId, item);
  }
  

  // ✅ Modifier la quantité d’un produit dans le panier
  @Public()
  @Patch(':userId/update')
  async updateQuantity(@Param('userId') userId: string, @Body() body: any) {
    const { productId, size, quantity } = body;
    return this.cartService.updateItemQuantity(userId, productId, size, quantity);
  }

  // ✅ Supprimer un article du panier
  @Public()
  @Delete(':userId/:productId')
  async removeItem(@Param('userId') userId: string, @Param('productId') productId: string) {
    return this.cartService.removeItemFromCart(userId, productId);
  }
}
