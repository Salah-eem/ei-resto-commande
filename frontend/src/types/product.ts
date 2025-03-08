import { Category } from "./category";

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  stock: number;
  image_url?: string;
  hasSize?: boolean;
  sizes?: string[];
}
