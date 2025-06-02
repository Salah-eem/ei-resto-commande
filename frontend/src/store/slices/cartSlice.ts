import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { CartItem } from "@/types/cartItem";
import api from "@/lib/api";

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
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cart/${userId}`);
      return response.data.items as CartItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors du chargement du panier."
      );
    }
  }
);

// 📌 Ajouter un produit au panier
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async (
    {
      userId,
      item,
    }: { userId: string; item: CartItem },
    { rejectWithValue }
  ) => {
    try {
      // S’assurer que chaque ingrédient a bien un champ quantity
      const itemWithQty = {
        ...item,
        baseIngredients: (item.baseIngredients || []).map((ing) => ({
          ...ing,
          quantity: ing.quantity ?? 1,
        })),
        ingredients: (item.ingredients || []).map((ing) => ({
          ...ing,
          quantity: ing.quantity ?? 1,
        })),
      };
      const response = await api.post(`/cart/${userId}/add`, itemWithQty);
      return response.data.items as CartItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Erreur lors de l'ajout du produit au panier."
      );
    }
  }
);

// 📌 Modifier la quantité d’un produit
export const updateCartQuantity = createAsyncThunk(
  "cart/updateCartQuantity",
  async (
    {
      userId,
      productId,
      size,
      quantity,
      ingredients,
    }: {
      userId: string;
      productId: string;
      size?: string;
      quantity: number;
      ingredients?: any[];
    },
    { rejectWithValue }
  ) => {
    try {
      // S’assurer que chaque ingrédient a bien un champ quantity
      const ingredientsWithQty = (ingredients || []).map((ing) => ({
        ...ing,
        quantity: ing.quantity ?? 1,
      }));
      const response = await api.patch(`/cart/${userId}/update`, {
        productId,
        size,
        quantity,
        ingredients: ingredientsWithQty,
      });
      return response.data.items as CartItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de la mise à jour du produit."
      );
    }
  }
);

// 📌 Supprimer un item du panier (on passe l’itemId)
export const removeFromCart = createAsyncThunk(
  "cart/removeFromCart",
  async (
    {
      userId,
      itemId,
    }: {
      userId: string;
      itemId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Appelle maintenant DELETE /cart/:userId/item/:itemId
      const response = await api.delete(`/cart/${userId}/item/${itemId}`);
      return response.data.items as CartItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de la suppression du produit."
      );
    }
  }
);

// 📌 Vider complètement le panier
export const clearCart = createAsyncThunk(
  "cart/clearCart",
  async (userId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cart/${userId}/clear`);
      return [] as CartItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de la suppression du panier."
      );
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // -------------------------
      // ✅ Récupération du panier
      // -------------------------
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

      // -------------------------
      // ✅ Ajout d’un produit
      // -------------------------
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

      // --------------------------------
      // ✅ Mise à jour de la quantité
      // --------------------------------
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

      // -------------------------
      // ✅ Suppression d’un item
      // -------------------------
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

      // -----------------------------
      // ✅ Vider complètement le panier
      // -----------------------------
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
