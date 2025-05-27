import { Address } from "./address";

export interface Restaurant {
    name: string;
    address: Address;
    deliveryFee: number;
    phoneNumber?: string;
    logoUrl?: string;
    openingHours?: string; // Exemple: "09:00 - 22:00"
    description?: string;
}