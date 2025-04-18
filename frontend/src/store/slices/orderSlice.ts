import { Order } from "@/types/order";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";


interface OrderState {
  order: Order | null;
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  order: null,
  orders: [],
  loading: false,
  error: null,
};

// 📌 Récupérer les commandes d'un utilisateur en utilisant l'interceptor
export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async (userId: string, { rejectWithValue }) => {
    try {
      // L'interceptor ajoutera automatiquement le token à l'en-tête Authorization
      const response = await api.get(`/order/user/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while loading orders."
      );
    }
  }
);

// 📌 Récupérer une commande 
export const fetchOrder = createAsyncThunk(
  "orders/fetchOrder",
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/order/${orderId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Error while loading orders."
      );
    }
  }
);

// 📌 Prendre une commande
export const createOrder = createAsyncThunk(
  "orders/createPhoneOrder",
  async (orderData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/order/create-phone", orderData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de la création de la commande."
      );
    }
  }
);

// 📌 Récupérer les commandes en préparation (pour les employés)
export const fetchLiveOrders = createAsyncThunk(
  "orders/fetchLiveOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/order/live");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors du chargement des commandes live."
      );
    }
  }
);



const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(fetchLiveOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLiveOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchLiveOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })      
      ;
  },
});

export default orderSlice.reducer;
