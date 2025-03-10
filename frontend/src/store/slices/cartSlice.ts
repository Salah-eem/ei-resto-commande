import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { CartItem } from "@/types/cartItem";

const API_URL = "http://localhost:3001/cart"; // URL backend

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
};

// 📌 Récupérer le panier
export const fetchCart = createAsyncThunk("cart/fetchCart", async (userId: string, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/${userId}`);
    return response.data.items;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Erreur lors du chargement du panier.");
  }
});

// 📌 Ajouter un produit au panier
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ userId, item }: { userId: string; item: CartItem }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/${userId}/add`, item);
      return response.data.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur lors de l'ajout du produit au panier.");
    }
  }
);

// 📌 Modifier la quantité d’un produit
export const updateCartQuantity = createAsyncThunk(
  "cart/updateCartQuantity",
  async ({ userId, productId, size, quantity }: { userId: string; productId: string; size?: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/${userId}/update`, {
        productId,
        size,
        quantity,
      });
      return response.data.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur lors de la mise à jour du produit.");
    }
  }
);

// 📌 Supprimer un produit du panier
export const removeFromCart = createAsyncThunk(
  "cart/removeFromCart",
  async ({ userId, productId, size }: { userId: string; productId: string; size?: string }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_URL}/${userId}/${productId}`, {
        data: { size },
      });
      return response.data.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur lors de la suppression du produit.");
    }
  }
);

// 📌 Vider complètement le panier
export const clearCart = createAsyncThunk("cart/clearCart", async (userId: string, { rejectWithValue }) => {
  try {
    await axios.delete(`${API_URL}/${userId}/clear`);
    return [];
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Erreur lors de la suppression du panier.");
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ✅ Récupération du panier
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ Ajout d’un produit
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ Mise à jour de la quantité
      .addCase(updateCartQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(updateCartQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ Suppression d’un produit
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ Vider complètement le panier
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default cartSlice.reducer;
