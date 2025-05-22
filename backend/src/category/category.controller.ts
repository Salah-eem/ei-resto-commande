import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateUpdateCategoryDto } from './dto/create-update-category.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('category')
export class CategoryController {

    constructor(private categoryService: CategoryService) {}

    @Public()
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
    async create(@Body() dto: CreateUpdateCategoryDto) {
        return await this.categoryService.create(dto);
    }

    @Post('check-name')
    async checkName(@Body('name') name: string, @Body('catId') catId: string) {
        name = name.trim().toLocaleLowerCase();
        const isUnique = await this.categoryService.isNameUnique(name, catId);
        return { unique: isUnique };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: CreateUpdateCategoryDto) {
        return await this.categoryService.update(id, dto);
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
