import { Category } from "./category";

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    image_url?: string;
    category: Category;
  }
  