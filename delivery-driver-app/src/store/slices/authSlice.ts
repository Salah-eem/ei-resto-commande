import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "../../services/ApiService";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  loading: boolean;
  error: string | null;
}

// Fonction pour décoder le JWT
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erreur when decoding JWT:', error);
    return null;
  }
};

// Rôles autorisés
const ALLOWED_ROLES = [0, 1]; // 0 pour 'admin', 1 pour 'employee'

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
};

// Async thunks
export const loginAsync = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.login(
        credentials.email,
        credentials.password
      );
      
      // Décoder le token pour obtenir les informations utilisateur
      const decodedToken = decodeJWT(response.access_token);
      if (!decodedToken) {
        return rejectWithValue("Invalid token");
      }
      
      // Vérifier le rôle de l'utilisateur
      const userRole = decodedToken.role;
      if (!ALLOWED_ROLES.includes(userRole)) {
        return rejectWithValue("Access denied. This application is reserved for administrators and employees.");
      }
      
      await AsyncStorage.setItem("access_token", response.access_token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const logoutAsync = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
    } catch (error: any) {
      return rejectWithValue(error.message || "Logout failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
