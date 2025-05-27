import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateUpdateProductDto } from './dto/create-update-product.dto';
import { Product } from 'src/schemas/product.schema';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Public()
  @Get()
  async getAll() {
    return this.productService.getAll();
  }

  @Public()
  @Get('most-ordered')
  async getMostOrderedProducts() {
    return this.productService.getMostOrderedProducts();
  }

  @Public()
  @Get('stats')
  async getProductStats() {
    return this.productService.getProductStats();
  }

  @Public()
  @Get('ingredients/:productId')
  async getProductIngredientsById(@Param('productId') productId: string) {
    return this.productService.getProductIngredientsById(productId);
  }

  @Roles(Role.Admin)
  @Post()
  async create(@Body() dto: CreateUpdateProductDto) {
    console.log('dto controller : ', dto);
    return await this.productService.create(dto);
  }

  @Roles(Role.Admin)
  @Post('check-name')
  async checkName(@Body('name') name: string, @Body('prodId') prodId: string) {
    name = name.trim().toLocaleLowerCase();
    const isUnique = await this.productService.isNameUnique(name, prodId);
    return { unique: isUnique };
  }

  @Roles(Role.Admin)
  @Put(':productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() dto: CreateUpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProduct(productId, dto);
  }

  // Mettre à jour TOUS les produits
  @Roles(Role.Admin)
  @Put('/update-all')
  async updateAllProducts(@Body() updateData: Partial<Product>) {
    return this.productService.updateAllProducts(updateData);
  }

  @Roles(Role.Admin)
  @Put('image/:productId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/images/products',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async updatePhoto(
    @UploadedFile() file: Express.Multer.File,
    @Param('productId') productId: string,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const imageUrl = `/images/products/${file.filename}`;
    return this.productService.updateProductImage(productId, imageUrl);
  }

  @Roles(Role.Admin)
  @Delete(':productId')
  async deleteProduct(@Param('productId') productId: string) {
    return this.productService.deleteProductById(productId);
  }
}
