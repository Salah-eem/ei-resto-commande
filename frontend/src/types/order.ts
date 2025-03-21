import { Address } from "./address";
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

export enum PaymentMethod {
  CARD = "card",
  PAYPAL = "paypal",
  CASH = "cash",
}

export enum OrderType {
  PICKUP = "pickup",
  DELIVERY = "delivery",
}

// 🔄 Historique position avec timestamp
export interface PositionHistory extends Address {
  timestamp: string; // Date ISO string
}

export interface Order {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  deliveryFee: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderType: OrderType;
  estimatedDelivery: number;
  estimatedArrivalTime?: string;
  createdAt: string;
  updatedAt: string;
  deliveryPosition: Address | null;
  positionHistory: PositionHistory[];
  lastPositionUpdate: string | null;
}
