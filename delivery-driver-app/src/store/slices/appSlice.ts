import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  theme: "light" | "dark";
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  locationPermission: boolean;
  cameraPermission: boolean;
  lastSyncTime: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  isInitialized: false,
  isOnline: true,
  theme: "light",
  language: "fr",
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  locationPermission: false,
  cameraPermission: false,
  lastSyncTime: null,
  loading: false,
  error: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (
      state,
      action: PayloadAction<Partial<AppState["notifications"]>>
    ) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setLocationPermission: (state, action: PayloadAction<boolean>) => {
      state.locationPermission = action.payload;
    },
    setCameraPermission: (state, action: PayloadAction<boolean>) => {
      state.cameraPermission = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setInitialized,
  setOnlineStatus,
  setTheme,
  setLanguage,
  updateNotificationSettings,
  setLocationPermission,
  setCameraPermission,
  setLastSyncTime,
  setLoading,
  setError,
  clearError,
} = appSlice.actions;
export default appSlice.reducer;
