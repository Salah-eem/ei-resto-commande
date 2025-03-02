import { Injectable } from "@nestjs/common";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator } from "class-validator";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Category } from "src/schemas/category.schema";

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueCategoryConstraint implements ValidatorConstraintInterface {
    constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

    async validate(name: string) {
        const category = await this.categoryModel.findOne({ name });
        return !category; // Retourne true si aucun doublon trouvé
    }

    defaultMessage(args: ValidationArguments) {
        return `La catégorie "${args.value}" existe déjà.`;
    }
}

// Fonction décorateur pour simplifier l'utilisation
export function IsUniqueCategory() {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: { message: "Ce nom de catégorie existe déjà." },
            constraints: [],
            validator: IsUniqueCategoryConstraint,
        });
    };
}
