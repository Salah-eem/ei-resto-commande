import { redirect } from 'next/navigation';
import { Product } from '@/types';

const baseUrl = 'http://localhost:3001';

export async function login(credentials: { email: string; password: string }) {
  const response = await fetch(`${baseUrl}/product/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await response.json(); // Récupère la réponse JSON du backend

  if (!response.ok) {
    throw new Error(data.message || 'Échec de la connexion');
  }

  //Stocker le token dans localStorage
  localStorage.setItem("access_token", data.access_token);
  //redirect("home");


  return data;
}

export async function getProducts() {
  // Récupérer les produits depuis l'API
  const res = await fetch(`${baseUrl}/product`);
  const products = await res.json();

  return products;
}

export async function getCategories() {
  const res = await fetch(`${baseUrl}/category`);
  const categories = await res.json();

  return categories;
}
