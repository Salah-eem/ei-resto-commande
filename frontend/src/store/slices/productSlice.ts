import { Product } from "@/types/product";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// const API_URL = "http://localhost:3001/product"; // URL backend
const API_URL = process.env.API_URL!+"/product";

interface ProductState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

// 📌 État initial
const initialState: ProductState = {
  items: [],
  loading: false,
  error: null,
};

// 📌 Récupérer les produits depuis le backend
export const fetchProducts = createAsyncThunk("products/fetchProducts", async () => {
  const response = await axios.get(API_URL);
  return response.data;
});

// 📌 Slice Redux
const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Erreur de chargement des produits.";
      });
  },
});

export default productSlice.reducer;
