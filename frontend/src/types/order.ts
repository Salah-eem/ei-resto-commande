import { Address } from "./address";
import { CartItem } from "./cartItem";

export enum OrderStatus {
  IN_PREPARATION = 'in preparation',
  READY_FOR_PICKUP = 'ready for pickup',
  READY_FOR_DELIVERY = 'ready for delivery',
  PICKED_UP = 'picked up',
  OUT_FOR_DELIVERY = 'out for delivery',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
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
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderType: OrderType;
  createdAt: string;
  updatedAt: string;
  deliveryAddress: Address | null;
  positionHistory: PositionHistory[];
  lastPositionUpdate: string | null;
}
