// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { User } from "@/types/user";
import { getUserId } from "@/utils/user.utils";

interface UserState {
  userId: string | null;
  profile: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  userId: typeof window !== "undefined" ? getUserId() : null,
  profile: null,
  loading: false,
  error: null,
};

// Thunk pour récupérer le profil utilisateur depuis l'endpoint /user/profile
export const fetchUserProfile = createAsyncThunk(
  "user/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/user/profile");
      return response.data as User;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Erreur lors de la récupération du profil utilisateur"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
      localStorage.setItem("user_id", action.payload);
    },
    setUserProfile: (state, action: PayloadAction<User>) => {
      state.profile = action.payload;
      state.userId = action.payload._id;
      localStorage.setItem("user_id", action.payload._id);
    },
     clearUser: (state) => {
      // Supprimer l'ancien identifiant utilisateur du localStorage
      localStorage.removeItem("user_id");
      // Générer un nouveau guestId et le stocker
      const newGuestId = getUserId();
      state.userId = newGuestId;
      state.profile = null;
      console.log("userId mis à jour :", state.userId); // Vérifiez ici
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchUserProfile.fulfilled,
      (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.profile = action.payload;
        state.userId = action.payload._id;
        localStorage.setItem("user_id", action.payload._id);
      }
    );
    builder.addCase(fetchUserProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setUserId, setUserProfile, clearUser } = userSlice.actions;
export default userSlice.reducer;
