import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { IngredientService } from './ingredient.service';
import { CreateUpdateIngredientDto } from './dto/create-update-ingredient.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Public } from 'src/common/decorators/public.decorator';

@Roles(Role.Admin)
@Controller('ingredient')
export class IngredientController {

    constructor(private readonly ingredientService: IngredientService) {}


    @Public()
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
    @UseInterceptors(FileInterceptor('file'))
    async addIngredient(@UploadedFile() file: Express.Multer.File, @Body() ingredientData: CreateUpdateIngredientDto) {
        if (file) ingredientData.image_url = `/images/ingredients/${file.filename}`;
        return await this.ingredientService.addIngredient(ingredientData);
    }

    @Post('check-name-unique')
    async checkNameUnique(@Body('name') name: string, @Body('ingredientId') ingredientId: string) {
        const isUnique = await this.ingredientService.isNameUnique(name, ingredientId);
        return { unique: isUnique };
    }

    @Put('update/:id')
    @UseInterceptors(FileInterceptor('file'))
    async updateIngredient(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() ingredientData: CreateUpdateIngredientDto) {
        if (file) ingredientData.image_url = `/images/ingredients/${file.filename}`;
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

    @Put('image/:ingredientId')
      @UseInterceptors(
        FileInterceptor('file', {
          storage: diskStorage({
            destination: './public/images/ingredients',
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
      async updateImage(
        @UploadedFile() file: Express.Multer.File,
        @Param('ingredientId') ingredientId: string,
      ) {
        if (!file) {
          throw new Error('No file uploaded');
        }
        const imageUrl = `/images/ingredients/${file.filename}`;
        return this.ingredientService.updateIngredientImage(ingredientId, imageUrl);
      }

}
