import { IsString, MinLength } from 'class-validator';
import { IsUniqueCategory } from '../validator/name-validator';

export class CreateCategoryDto {
    @IsString()
    @MinLength(3)
    //@IsUniqueCategory()
    name: string;

}