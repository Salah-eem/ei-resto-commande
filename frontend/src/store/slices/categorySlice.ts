import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Category } from "@/types/category";
import api from "@/lib/api";


interface CategoryState {
  items: Category[];
  loading: boolean;
  error: string | null;
}

// 📌 État initial
const initialState: CategoryState = {
  items: [],
  loading: false,
  error: null,
};

// 📌 Récupérer les catégories depuis le backend
export const fetchCategories = createAsyncThunk("categories/fetchCategories", async () => {
  const response = await api.get("/category");
  return response.data;
});

// 📌 Slice Redux
const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Erreur de chargement des catégories.";
      });
  },
});

export default categorySlice.reducer;
