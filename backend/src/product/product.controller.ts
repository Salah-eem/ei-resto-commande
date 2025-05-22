import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateUpdateProductDto } from './dto/create-update-product.dto';
import { Product } from 'src/schemas/product.schema';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';

@UseGuards(JwtGuard)
@Controller('product')
export class ProductController {

    constructor(private productService: ProductService) {}

    @Public()
    @Get()
    async getAll() {
        return this.productService.getAll();
    }

    @Roles(Role.Admin)
    @Post()
    async create(@Body() dto: CreateUpdateProductDto) {
      console.log('dto controller : ', dto);
        return await this.productService.create(dto);
    }

    
    @Post('check-name')
    async checkName(@Body('name') name: string, @Body('prodId') prodId: string) {
        name = name.trim().toLocaleLowerCase();
        const isUnique = await this.productService.isNameUnique(name, prodId);
        return { unique: isUnique };
    }

    @Roles(Role.Admin)
    @Put(':productId')
    async updateProduct(@Param('productId') productId: string, @Body() dto: CreateUpdateProductDto
    ): Promise<Product> {
      return this.productService.updateProduct(productId, dto);
    }
    
  // Mettre à jour TOUS les produits
  @Roles(Role.Admin)
  @Put('/update-all')
  async updateAllProducts(@Body() updateData: Partial<Product>) {
    return this.productService.updateAllProducts(updateData);
  }
}
