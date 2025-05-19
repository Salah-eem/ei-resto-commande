import { Address } from "./address";

export enum Role {
    Admin = 0, Employee = 1, Client = 2
}

export interface User {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    addresses: Address[];
    role: Role;
}