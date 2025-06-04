export interface Ingredient {
    _id: string;
    name: string;
    price: number;
    stock: number | null;
    image_url?: string;
    description?: string;
}
