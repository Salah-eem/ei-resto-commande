export interface Address {
  lat: number;
  lng: number;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  streetNumber?: number;
}