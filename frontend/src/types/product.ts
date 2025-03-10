import { Category } from "./category";

export enum ProductType {
  SINGLE_PRICE = 'single_price', // Produits sans tailles (ex: Boissons, Desserts)
  MULTIPLE_SIZES = 'multiple_sizes', // Produits avec tailles (ex: Pizzas)
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: Category;
  productType: ProductType;
  stock: number;
  image_url?: string;
  
  // Pour les produits sans tailles
  basePrice?: number;

  // Pour les produits avec tailles
  sizes?: { name: string; price: number }[];
}
