import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Order } from "../../types";
import ApiService from "../../services/ApiService";

interface OrderState {
  orders: Order[];
  ordersHistory: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  // Stats state
  dashboardStats: any | null;
  comprehensiveStats: any | null;
  performanceStats: any | null;
  statsLoading: boolean;
  statsError: string | null;
}

const initialState: OrderState = {
  orders: [],
  ordersHistory: [],
  currentOrder: null,
  loading: false,
  error: null,
  refreshing: false,
  // Stats initial state
  dashboardStats: null,
  comprehensiveStats: null,
  performanceStats: null,
  statsLoading: false,
  statsError: null,
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async (_, { rejectWithValue }) => {
    try {
      const orders = await ApiService.getOrders();
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch orders");
    }
  }
);

export const fetchOrdersHistory = createAsyncThunk(
  "orders/fetchOrdersHistory",
  async (_, { rejectWithValue }) => {
    try {
      const orders = await ApiService.getOrdersHistory();
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch order history");
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  "orders/fetchOrderById",
  async (orderId: string, { rejectWithValue }) => {
    try {
      const order = await ApiService.getOrderById(orderId);
      return order;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch order");
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  "orders/updateOrderStatus",
  async (
    { orderId, status }: { orderId: string; status: string },
    { rejectWithValue }
  ) => {
    try {
      const updatedOrder = await ApiService.updateOrderStatus(orderId, status);
      return updatedOrder;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update order status");
    }
  }
);

export const refreshOrders = createAsyncThunk(
  "orders/refreshOrders",
  async (_, { rejectWithValue }) => {
    try {
      const orders = await ApiService.getOrders();
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to refresh orders");
    }
  }
);

// Stats-related async thunks
export const fetchDashboardStats = createAsyncThunk(
  "orders/fetchDashboardStats",
  async (_, { rejectWithValue }) => {
    try {
      const stats = await ApiService.getQuickDashboardStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch dashboard stats"
      );
    }
  }
);

export const fetchComprehensiveStats = createAsyncThunk(
  "orders/fetchComprehensiveStats",
  async (
    params: { startDate?: string; endDate?: string; driverId?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const stats = await ApiService.getComprehensiveStats(
        params.startDate,
        params.endDate,
        params.driverId
      );
      return stats;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch comprehensive stats"
      );
    }
  }
);

export const fetchDriverPerformanceStats = createAsyncThunk(
  "orders/fetchDriverPerformanceStats",
  async (
    params: { driverId?: string; period?: "today" | "week" | "month" } = {},
    { rejectWithValue }
  ) => {
    try {
      const stats = await ApiService.getDriverPerformanceStats(
        params.driverId,
        params.period || "today"
      );
      return stats;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch driver performance stats"
      );
    }
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearStatsError: (state) => {
      state.statsError = null;
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    updateOrderInList: (state, action: PayloadAction<Order>) => {
      const index = state.orders.findIndex(
        (order) => order._id === action.payload._id
      );
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    },
    // Stats-related reducers
    clearStats: (state) => {
      state.dashboardStats = null;
      state.comprehensiveStats = null;
      state.performanceStats = null;
      state.statsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
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
      // Fetch orders history
      .addCase(fetchOrdersHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdersHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.ordersHistory = action.payload;
      })
      .addCase(fetchOrdersHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedOrder = action.payload;
        const index = state.orders.findIndex(
          (order) => order._id === updatedOrder._id
        );
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
        if (state.currentOrder && state.currentOrder._id === updatedOrder._id) {
          state.currentOrder = updatedOrder;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Refresh orders
      .addCase(refreshOrders.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshOrders.fulfilled, (state, action) => {
        state.refreshing = false;
        state.orders = action.payload;
      })
      .addCase(refreshOrders.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload as string;
      })
      // Dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      })
      // Comprehensive stats
      .addCase(fetchComprehensiveStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchComprehensiveStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.comprehensiveStats = action.payload;
      })
      .addCase(fetchComprehensiveStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      })
      // Driver performance stats
      .addCase(fetchDriverPerformanceStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchDriverPerformanceStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.performanceStats = action.payload;
      })
      .addCase(fetchDriverPerformanceStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearStatsError,
  setCurrentOrder,
  clearCurrentOrder,
  updateOrderInList,
  clearStats,
} = orderSlice.actions;
export default orderSlice.reducer;
