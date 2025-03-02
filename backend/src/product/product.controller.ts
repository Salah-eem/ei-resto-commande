import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('product')
export class ProductController {

    constructor(private productService: ProductService) {}

    @Get()
    async getAll() {
        return this.productService.getAll();
    }

    @Post()
    async create(@Body() dto: CreateProductDto) {
        return await this.productService.create(dto);
    }
}
