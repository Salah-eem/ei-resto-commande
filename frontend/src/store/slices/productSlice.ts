import api from "@/lib/api";
import { Product } from "@/types/product";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";


interface ProductStats {
  productId: string;
  totalOrders: number;
  totalLikes: number;
  likePercentage: number;
}

interface ProductState {
  items: Product[];
  loading: boolean;
  error: string | null;
  stats: Record<string, ProductStats>;
}

// 📌 État initial
const initialState: ProductState = {
  items: [],
  loading: false,
  error: null,
  stats: {},
};

// 📌 Récupérer les produits depuis le backend
export const fetchProducts = createAsyncThunk("products/fetchProducts", async () => {
  const response = await api.get("product");
  return response.data;
});

// 📌 Récupérer les stats produits (commandes, likes)
export const fetchProductStats = createAsyncThunk("products/fetchProductStats", async () => {
  const response = await api.get("product/stats");
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
      })
      .addCase(fetchProductStats.fulfilled, (state, action) => {
        // Indexer les stats par productId pour accès rapide
        state.stats = {};
        for (const stat of action.payload) {
          state.stats[stat.productId] = stat;
        }
      });
  },
});

export default productSlice.reducer;
