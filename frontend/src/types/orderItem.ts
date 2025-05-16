
export interface OrderItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  preparedQuantity?: number;    // ← nombre d’unités déjà préparées
  isPrepared?: boolean;         // ← true quand preparedQuantity === quantity
  size?: string;
  image_url?: string;
}
