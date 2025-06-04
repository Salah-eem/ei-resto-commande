// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { User } from "@/types/user";
import { getUserId } from "@/utils/user.utils";

interface UserState {
  userId: string | null;
  profile: User | null;
  users: User[] | null;
  loading: boolean;
  error: string | string[] | null;
}

const initialState: UserState = {
  userId: typeof window !== "undefined" ? getUserId() : null,
  profile: null,
  users: null,
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

// Thunk pour récupérer tous les utilisateurs
export const fetchAllUsers = createAsyncThunk(
  "user/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/user");
      return response.data as User[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while loading users"
      );
    }
  }
);

// Thunk pour créer un utilisateur
export const createUser = createAsyncThunk(
  "user/createUser",
  async (user: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await api.post("/user", user);
      return response.data as User;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while creating user"
      );
    }
  }
);

export const createUserByAdmin = createAsyncThunk(
  "user/createUserByAdmin",
  async (user: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await api.post("/user/create-by-admin", user);
      return response.data as User;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while creating user"
      );
    }
  }
);

// Thunk pour mettre à jour un utilisateur
export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/user/${id}`, data);
      return response.data as User;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while updating user"
      );
    }
  }
);

// Thunk pour supprimer un utilisateur
export const deleteUserById = createAsyncThunk(
  "user/deleteUserById",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/user/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while deleting user"
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
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
    builder.addCase(fetchAllUsers.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAllUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
      state.loading = false;
      state.users = action.payload;
    });
    builder.addCase(fetchAllUsers.rejected, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
    builder.addCase(createUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.users = state.users ? [...state.users, action.payload] : [action.payload];
    });
    builder.addCase(createUser.rejected, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
    builder.addCase(createUserByAdmin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createUserByAdmin.fulfilled, (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.users = state.users ? [...state.users, action.payload] : [action.payload];
    });
    builder.addCase(createUserByAdmin.rejected, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
    builder.addCase(updateUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.users = state.users
        ? state.users.map((user) =>
            user._id === action.payload._id ? action.payload : user
          )
        : [];
    });
    builder.addCase(updateUser.rejected, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
    builder.addCase(deleteUserById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteUserById.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.users = state.users ? state.users.filter((user) => user._id !== action.payload) : null;
    });
    builder.addCase(deleteUserById.rejected, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (Array.isArray(payload)) {
        state.error = payload;
      } else if (Array.isArray(payload?.message)) {
        state.error = payload.message;
      } else {
        state.error = typeof payload === 'string' ? payload : payload?.message || "Unknown error";
      }
    });
  },
});

export const { setUserId, setUserProfile, clearUser } = userSlice.actions;
export default userSlice.reducer;
