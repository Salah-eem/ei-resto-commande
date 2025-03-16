import { v4 as uuidv4 } from 'uuid';

// Fonction pour générer un guestId et le stocker dans localStorage
export const getUserId = (): string => {
  let userId = localStorage.getItem("user_id");
  if (!userId) {
    userId = `guest-${uuidv4()}`;
    localStorage.setItem("user_id", userId);
  }
  return userId;
};