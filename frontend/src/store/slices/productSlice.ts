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

const initialState: ProductState = {
  items: [],
  loading: false,
  error: null,
  stats: {},
};

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("product");
      return response.data;
    } catch (error) {
      return rejectWithValue("Échec du chargement des produits");
    }
  }
);

export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/product", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur lors de l'ajout du produit.");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (
    { id, data }: { id: string; data: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/product/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Échec de la mise à jour du produit");
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/product/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue("Échec de la suppression du produit");
    }
  }
);

export const fetchProductStats = createAsyncThunk(
  "products/fetchProductStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("product/stats");
      return response.data;
    } catch (error) {
      return rejectWithValue("Échec du chargement des statistiques des produits");
    }
  }
);

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
        state.error = action.payload as string;
      })
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductStats.fulfilled, (state, action) => {
        state.stats = {};
        for (const stat of action.payload) {
          state.stats[stat.productId] = stat;
        }
      });
  },
});

export default productSlice.reducer;
