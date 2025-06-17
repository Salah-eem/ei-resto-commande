import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

// Import des slices
import authSlice from "./slices/authSlice";
import orderSlice from "./slices/orderSlice";
import deliverySlice from "./slices/deliverySlice";
import userSlice from "./slices/userSlice";
import appSlice from "./slices/appSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    orders: orderSlice,
    delivery: deliverySlice,
    user: userSlice,
    app: appSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks typés
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
