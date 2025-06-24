import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength, ValidateIf } from "class-validator";
import { registerDecorator, ValidationArguments } from "class-validator";

export function IsIngredientNameUnique(validationOptions?: any) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isIngredientNameUnique',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                async validate(value: any, args: ValidationArguments) {
                    const dto: any = args.object;
                    // On update, pass id to exclude
                    const service: any = (global as any).ingredientServiceInstance;
                    if (!service) return true; // fallback: skip
                    return await service.isNameUnique(value, dto._id);
                },
                defaultMessage() {
                    return 'Ingredient name must be unique';
                },
            },
            async: true,
        });
    };
}

export class CreateUpdateIngredientDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(3, { message: 'Ingredient name must be at least 3 characters' })
    @IsIngredientNameUnique({ message: 'Ingredient name must be unique' })
    name: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0, { message: 'Price must be a positive number' })
    price: number;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    quantity?: number | null;

    @IsOptional()
    @IsNumber()
    stock?: number | null;

    @IsOptional()
    @IsString()
    image_url?: string;

    @IsOptional()
    @IsString()
    @ValidateIf(o => o.description && o.description.length > 0)
    @MinLength(3, { message: 'Description must be at least 3 characters' })
    description?: string;
}
