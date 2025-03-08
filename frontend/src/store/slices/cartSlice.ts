import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:3001/cart"; // URL backend 

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

// 📌 Récupérer le panier (Correction : accepter `userId`)
export const fetchCart = createAsyncThunk("cart/fetchCart", async (userId: string) => {
  const response = await axios.get(`${API_URL}/${userId}`);
  return response.data.items;
});

// 📌 Ajouter un produit au panier (Correction : inclure `userId`)
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ userId, item }: { userId: string; item: CartItem }) => {
    const response = await axios.post(`${API_URL}/${userId}/add`, item);
    return response.data.items;
  }
);

// 📌 Modifier la quantité d’un produit (Correction : inclure `userId`)
export const updateCartQuantity = createAsyncThunk(
  "cart/updateCartQuantity",
  async ({ userId, productId, size, quantity }: { userId: string; productId: string; size?: string; quantity: number }) => {
    const response = await axios.patch(`${API_URL}/${userId}/update`, {
      productId,
      size,
      quantity,
    });
    return response.data.items;
  }
);

// 📌 Supprimer un produit du panier (Correction : inclure `userId`)
export const removeFromCart = createAsyncThunk(
  "cart/removeFromCart",
  async ({ userId, productId }: { userId: string; productId: string }) => {
    const response = await axios.delete(`${API_URL}/${userId}/${productId}`);
    return response.data.items;
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  },
});

export default cartSlice.reducer;
