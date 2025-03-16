import api from "@/lib/api";
import { Product } from "@/types/product";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";


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
  const response = await api.get("product");
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
