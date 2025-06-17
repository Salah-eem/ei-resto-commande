// Types principaux de l'application
export * from "./navigation";

// Interfaces principales
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  restaurantId: string;
  customer?: {
    name: string;
    phone: string;
  };
  deliveryDriver?: User;
  items: OrderItem[];
  orderStatus: OrderStatus;
  totalAmount: number;
  deliveryAddress: Address;
  restaurantAddress: Address;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface Address {
  street: string;
  streetNumber: number;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready for delivery"
  | "out for delivery"
  | "delivered"
  | "canceled";

export interface DeliveryStats {
  deliveredToday: number;
  deliveredThisWeek: number;
  pendingOrders: number;
  inProgressOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  averageDeliveryTime: number;
}

export interface Position {
  latitude: number;
  longitude: number;
  timestamp?: string;
  accuracy?: number;
  speed?: number;
}

export interface RestaurantInfo {
  _id: string;
  name: string;
  address: Address;
  phone: string;
  email: string;
}

// Types for user preferences
export interface UserPreferences {
  notifications: {
    newOrders: boolean;
    statusUpdates: boolean;
    earnings: boolean;
    push: boolean;
    sound: boolean;
    vibration: boolean;
  };
  delivery: {
    autoAcceptOrders: boolean;
    maxDeliveryDistance: number;
    preferredVehicle: "bike" | "car" | "motorcycle" | "scooter";
    workingHours: {
      start: string;
      end: string;
      daysOfWeek: number[];
    };
  };
  privacy: {
    shareLocation: boolean;
    shareEarnings: boolean;
    shareStats: boolean;
  };
}

export interface DriverProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  vehicle?: {
    type: "bike" | "car" | "motorcycle" | "scooter";
    licensePlate?: string;
    color?: string;
    model?: string;
  };
  ratings: {
    average: number;
    total: number;
  };
  stats: {
    totalDeliveries: number;
    completionRate: number;
    averageDeliveryTime: number;
  };
  verificationStatus?: {
    identity: boolean;
    drivingLicense: boolean;
    backgroundCheck: boolean;
  };
}
