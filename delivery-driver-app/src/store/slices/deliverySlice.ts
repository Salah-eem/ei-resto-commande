import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import LocationService from "../../services/LocationService";
import { ApiService } from "@/src/services";

interface Position {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface DeliveryState {
  isDelivering: boolean;
  currentPosition: Position | null;
  deliveryRoute: Position[];
  estimatedArrival: number | null;
  distance: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: DeliveryState = {
  isDelivering: false,
  currentPosition: null,
  deliveryRoute: [],
  estimatedArrival: null,
  distance: null,
  loading: false,
  error: null,
};

// Async thunks
export const startDelivery = createAsyncThunk(
  "delivery/startDelivery",
  async (orderId: string, { rejectWithValue }) => {
    try {
      await LocationService.startTracking();
      await ApiService.assignDeliveryDriver(orderId);
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to start delivery");
    }
  }
);

export const updatePosition = createAsyncThunk(
  "delivery/updatePosition",
  async (position: Position, { rejectWithValue }) => {
    try {
      // Update position in backend
      return position;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update position");
    }
  }
);

export const completeDelivery = createAsyncThunk(
  "delivery/completeDelivery",
  async (orderId: string, { rejectWithValue }) => {
    try {
      LocationService.stopTracking();
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to complete delivery");
    }
  }
);

const deliverySlice = createSlice({
  name: "delivery",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPosition: (state, action: PayloadAction<Position>) => {
      state.currentPosition = action.payload;
      state.deliveryRoute.push(action.payload);
    },
    clearRoute: (state) => {
      state.deliveryRoute = [];
    },
    setEstimatedArrival: (state, action: PayloadAction<number>) => {
      state.estimatedArrival = action.payload;
    },
    setDistance: (state, action: PayloadAction<number>) => {
      state.distance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start delivery
      .addCase(startDelivery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startDelivery.fulfilled, (state) => {
        state.loading = false;
        state.isDelivering = true;
        state.deliveryRoute = [];
      })
      .addCase(startDelivery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update position
      .addCase(updatePosition.fulfilled, (state, action) => {
        state.currentPosition = action.payload;
        state.deliveryRoute.push(action.payload);
      })
      // Complete delivery
      .addCase(completeDelivery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeDelivery.fulfilled, (state) => {
        state.loading = false;
        state.isDelivering = false;
        state.currentPosition = null;
        state.deliveryRoute = [];
        state.estimatedArrival = null;
        state.distance = null;
      })
      .addCase(completeDelivery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentPosition,
  clearRoute,
  setEstimatedArrival,
  setDistance,
} = deliverySlice.actions;
export default deliverySlice.reducer;
