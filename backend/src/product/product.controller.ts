import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from 'src/schemas/product.schema';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('product')
export class ProductController {

    constructor(private productService: ProductService) {}

    @Public()
    @Get()
    async getAll() {
        return this.productService.getAll();
    }

    @Post()
    async create(@Body() dto: CreateProductDto) {
        return await this.productService.create(dto);
    }

    @Patch(':productId')
    async updateProduct(@Param('productId') productId: string, @Body() updateData: Partial<Product>
    ): Promise<Product> {
      return this.productService.updateProduct(productId, updateData);
    }

  // Mettre à jour TOUS les produits
  @Put('/update-all')
  async updateAllProducts(@Body() updateData: Partial<Product>) {
    return this.productService.updateAllProducts(updateData);
  }
}
