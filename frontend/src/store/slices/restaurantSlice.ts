import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { Address } from "@/types/address";


interface RestaurantState {
  restaurantAddress: Address | null;
  deliveryFee: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: RestaurantState = {
  restaurantAddress: null,
  deliveryFee: null,
  loading: false,
  error: null,
};


export const fetchRestaurantInfo = createAsyncThunk("restaurant/fetchRestaurantInfo", async () => {
  const response = await api.get("restaurant/info");
  return response.data; // Renverra { address, deliveryFee }
});


// 📌 Slice Redux
const restaurantSlice = createSlice({
  name: "restaurant",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurantInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurantAddress = action.payload.address;
        state.deliveryFee = action.payload.deliveryFee;
      })
      .addCase(fetchRestaurantInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Erreur de chargement du restaurant.";
      });
  }  
});

export default restaurantSlice.reducer;
