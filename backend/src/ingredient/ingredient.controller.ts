import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IngredientService } from './ingredient.service';
import { CreateUpdateIngredientDto } from './dto/create-update-ingredient.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';


@UseGuards(JwtGuard)
@Roles(Role.Admin)
@Controller('ingredient')
export class IngredientController {

    constructor(private readonly ingredientService: IngredientService) {}


    @Get('all')
    async getAllIngredients() {
        return await this.ingredientService.getAll();
    }

    @Get('by-name/:name')
    async getIngredientByName(@Param('name') name: string) {
        return await this.ingredientService.getByName(name);
    }

    @Get('by-id/:id')
    async getIngredientById(@Param('id') id: string) {
        return await this.ingredientService.getById(id);
    }

    @Post('add')
    async addIngredient(@Body() ingredientData: CreateUpdateIngredientDto) {
        return await this.ingredientService.addIngredient(ingredientData);
    }

    @Post('check-name-unique')
    async checkNameUnique(@Body('name') name: string, @Body('ingredientId') ingredientId: string) {
        const isUnique = await this.ingredientService.isNameUnique(name, ingredientId);
        return { unique: isUnique };
    }

    @Put('update/:id')
    async updateIngredient(@Param('id') id: string, @Body() ingredientData: CreateUpdateIngredientDto) {
        return await this.ingredientService.updateIngredient(id, ingredientData);
    }

    @Delete('delete-by-id/:id')
    async deleteIngredient(@Param('id') id: string) {
        return await this.ingredientService.deleteIngredientById(id);
    }

    @Delete('delete-by-name/:name')
    async deleteIngredientByName(@Param('name') name: string) {
        return await this.ingredientService.deleteIngredientByName(name);
    }

    @Delete('delete-all')
    async deleteAllIngredients() {
        return await this.ingredientService.deleteAllIngredients();
    }

}
