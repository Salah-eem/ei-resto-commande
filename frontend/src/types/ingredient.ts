export interface Ingredient {
    _id: string;
    name: string;
    stock: number | null;
    image_url?: string;
    description?: string;
}
