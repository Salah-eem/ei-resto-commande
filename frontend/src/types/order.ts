import { CartItem } from "./cartItem";

export enum OrderStatus {
  IN_PROGRESS = "in_progress",
  READY = "ready",
  PICKED_UP = "picked_up",
  DELIVERED = "delivered",
  CANCELED = "canceled",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum OrderType {
  PICKUP = "pickup",
  DELIVERY = "delivery",
}

export interface Order {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  deliveryFee?: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  orderType: OrderType;
  estimatedDelivery: number;
  createdAt: string;
  updatedAt: string;
}
