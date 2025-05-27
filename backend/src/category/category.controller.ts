import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateUpdateCategoryDto } from './dto/create-update-category.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';

@Controller('category')
export class CategoryController {

    constructor(private categoryService: CategoryService) {}

    @Public()
    @Get()
    async getAll() {
        return this.categoryService.getAll();
    }

    @Roles(Role.Admin)
    @Get('getByName/:name')
    async getByName(@Param('name') name: string) {
        return this.categoryService.findByName(name);
    }

    @Roles(Role.Admin)
    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.categoryService.findById(id);
    }

    @Roles(Role.Admin)
    @Post()
    async create(@Body() dto: CreateUpdateCategoryDto) {
        return await this.categoryService.create(dto);
    }

    @Roles(Role.Admin)
    @Post('check-name')
    async checkName(@Body('name') name: string, @Body('catId') catId: string) {
        name = name.trim().toLocaleLowerCase();
        const isUnique = await this.categoryService.isNameUnique(name, catId);
        return { unique: isUnique };
    }

    @Roles(Role.Admin)
    @Post('check-idx-unique')
    async checkIdx(@Body('idx') idx: number, @Body('catId') catId: string) {
        const isUnique = await this.categoryService.isIdxUnique(idx, catId);
        return { unique: isUnique };
    }

    @Roles(Role.Admin)
    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: CreateUpdateCategoryDto) {
        return await this.categoryService.update(id, dto);
    }

    @Roles(Role.Admin)
    @Delete(':id') 
    async delete(@Param('id') id: string) {
        return this.categoryService.delete(id);
    }
    
    @Roles(Role.Admin)
    @Delete()
    async deleteAll() {
        return await this.categoryService.deleteAll();
    }

    @Roles(Role.Admin)
    @Post('reorder')
    async reorderCategories(@Body() body: { updates: { _id: string, idx: number }[] }) {
        // Appelle le service pour faire le bulk update
        return this.categoryService.reorderCategories(body.updates);
    }

}
