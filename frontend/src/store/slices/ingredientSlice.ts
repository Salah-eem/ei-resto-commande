import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { Ingredient } from "@/types/ingredient";

export const fetchIngredients = createAsyncThunk(
  "ingredients/fetchIngredients",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/ingredient/all");
      return res.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch ingredients");
    }
  }
);

export const addIngredient = createAsyncThunk(
  "ingredients/addIngredient",
  async (ingredient: Ingredient, { rejectWithValue }) => {
    try {
      const response = await api.post("/ingredient/add", ingredient);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error adding ingredient."
      );
    }
  }
);

export const updateIngredient = createAsyncThunk(
  "ingredients/updateIngredient",
  async (
    { id, data }: { id: string; data: Partial<Ingredient> },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/ingredient/update/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data || "Failed to update ingredient"
      );
    }
  }
);

export const updateIngredientImage = createAsyncThunk(
  "ingredients/updateIngredientImage",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(`/ingredient/image/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data || "Failed to update ingredient image"
      );
    }
  }
);

export const deleteIngredient = createAsyncThunk(
  "ingredients/deleteIngredient",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/ingredient/delete-by-id/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue("Failed to delete ingredient");
    }
  }
);

interface IngredientState {
  items: Ingredient[];
  loading: boolean;
  error: string | null;
}

const initialState: IngredientState = {
  items: [],
  loading: false,
  error: null,
};

const ingredientSlice = createSlice({
  name: "ingredients",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIngredient.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIngredient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateIngredientImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIngredientImage.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateIngredientImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIngredient.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default ingredientSlice.reducer;
