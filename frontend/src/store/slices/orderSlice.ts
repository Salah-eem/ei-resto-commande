import { Order } from "@/types/order";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";


interface OrderState {
  order: Order | null;
  orders: Order[];
  todayOrders: Order[];
  scheduledOrders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  order: null,
  orders: [],
  todayOrders: [],
  scheduledOrders: [],
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
  "orders/createOrderByEmployee",
  async (orderData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/order/create-by-employee", orderData);
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

// 📌 Récupérer toutes les commandes du jour
export const fetchTodayOrders = createAsyncThunk(
  "orders/fetchTodayOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/order/today");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors du chargement des commandes du jour."
      );
    }
  }
);

// 📌 Récupérer les commandes programmée
export const fetchScheduledOrders = createAsyncThunk(
  "orders/fetchScheduledOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/order/scheduled");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors du chargement des commandes programmées."
      );
    }
  }
);

// 📌 Mettre à jour le statut d'une commande
export const updateOrderStatus = createAsyncThunk(
  "orders/updateOrderStatus",
  async ({ orderId, status }: { orderId: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/order/${orderId}/status`, { status });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Erreur lors de la mise à jour du statut de la commande."
      );
    }
  }
);

// Mettre à jour une commande
export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async ({ orderId, orderData }: { orderId: string; orderData: Partial<Order> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/order/${orderId}`, orderData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to update order');
    }
  }
);

export const validateOrderItem = createAsyncThunk(
  'orders/validateOrderItem',
  async ({ orderId, itemId }: { orderId: string; itemId: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/order/${orderId}/validate-item`, { itemId });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to validate order item');
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
      .addCase(fetchTodayOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.todayOrders = action.payload;
      })
      .addCase(fetchTodayOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchScheduledOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScheduledOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.scheduledOrders = action.payload;
      })
      .addCase(fetchScheduledOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedOrder = action.payload;
        state.orders = state.orders.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.loading = false;
        const updatedOrder = action.payload;
        state.orders = state.orders.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default orderSlice.reducer;
