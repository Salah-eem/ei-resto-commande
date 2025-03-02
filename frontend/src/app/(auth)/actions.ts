"use server";

import { redirect } from "next/navigation";

export async function loginAction(data: { email: string; password: string }) {

  const response = await fetch("http://localhost:3001/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // return errorData.message; // Retourne l'erreur pour affichage
    throw new Error(errorData.message || 'Connexion failed');
  }

  //Redirection après un login réussi
  redirect("/home");
}
