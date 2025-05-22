import { IsNumber, IsString, MinLength } from 'class-validator';
import { IsUniqueCategory } from '../validator/name-validator';

export class CreateUpdateCategoryDto {
    @IsString()
    @MinLength(3)
    //@IsUniqueCategory()
    name: string;

    @IsNumber()
    idx: number;

}