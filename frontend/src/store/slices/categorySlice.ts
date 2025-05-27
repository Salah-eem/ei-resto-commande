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
export const fetchCategories = createAsyncThunk("categories/fetchCategories", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/category");
    return response.data;
  } catch (error) {
    return rejectWithValue("Échec de la récupération des catégories");
  }
});

// 📌 Ajouter une catégorie
export const addCategory = createAsyncThunk(
  "categories/addCategory",
  async (data: { name: string; idx: number }, { rejectWithValue }) => {
    try {
      const response = await api.post("/category", data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur lors de l'ajout de la catégorie.");
    }
  }
);

// 📌 Mettre à jour une catégorie
export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async (
    { id, data }: { id: string; data: Partial<Category> },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/category/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Échec de la mise à jour de la catégorie");
    }
  }
);

// 📌 Supprimer une catégorie
export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/category/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue("Échec de la suppression de la catégorie");
    }
  }
);

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
        state.error = action.payload as string;
      })
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default categorySlice.reducer;
