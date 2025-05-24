import { Address } from "./address";
import { CartItem } from "./cartItem";
import { OrderItem } from "./orderItem";

export enum OrderStatus {
  CONFIRMED = 'confirmed',
  SCHEDULED = 'scheduled',
  IN_PREPARATION = 'in preparation',
  PREPARED = 'prepared',
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

export interface Customer {
  name: string;
  phone: string;
}

// Ajout du type DeliveryPerson pour extension future
export interface DeliveryPerson {
  name: string;
  phone?: string;
}

export interface Order {
  _id: string;
  userId: string;
  source: string;
  customer: Customer; // Added customer details
  items: OrderItem[];
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
  scheduledFor: string | null; // Date ISO string
  deliveryPerson?: DeliveryPerson; // Ajouté pour suivi livreur
}
