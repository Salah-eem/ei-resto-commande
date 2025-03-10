import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  userId: string | null;
}

// 📌 Fonction pour générer un `guestId` et le stocker dans `localStorage`
const getGuestId = (): string => {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = `guest-${Date.now()}`;
    localStorage.setItem("userId", userId);
  }
  return userId;
};

// 📌 État initial
const initialState: UserState = {
  userId: typeof window !== "undefined" ? getGuestId() : null,
};

// 📌 Slice Redux
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // ✅ Met à jour `userId` après connexion
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
      localStorage.setItem("userId", action.payload);
    },
    
    // ✅ Déconnexion : Reprend un `guestId`
    clearUserId: (state) => {
      state.userId = getGuestId();
    },
  },
});

export const { setUserId, clearUserId } = userSlice.actions;
export default userSlice.reducer;
