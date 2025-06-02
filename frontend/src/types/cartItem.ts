import { Category } from "./category";
import { Ingredient } from "./ingredient";

// Ajout pour la personnalisation
export interface IngredientWithQuantity {
  _id: string; // or Types.ObjectId if you use it in frontend
  ingredient: Ingredient; // Référence à l'ingrédient
  quantity: number;
}

export interface CartItem {
    _id?: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    image_url?: string;
    category: Category;
    baseIngredients: IngredientWithQuantity[]; // ingrédients de base du produit
    ingredients: IngredientWithQuantity[]; // ingrédients personnalisés (après modifications)
}
