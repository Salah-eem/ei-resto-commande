import { CartItem } from "./cartItem";

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELED = "canceled",
}

export interface Order {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}
