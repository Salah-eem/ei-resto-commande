import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('category')
export class CategoryController {

    constructor(private categoryService: CategoryService) {}

    @Get()
    async getAll() {
        return this.categoryService.getAll();
    }

    @Get('getByName/:name')
    async getByName(@Param('name') name: string) {
        return this.categoryService.findByName(name);
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.categoryService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreateCategoryDto) {
        return await this.categoryService.create(dto);
    }

    
    @Delete(':id') 
    async delete(@Param('id') id: string) {
        return this.categoryService.delete(id);
    }
    
    @Delete()
    async deleteAll() {
        return await this.categoryService.deleteAll();
    }

}
