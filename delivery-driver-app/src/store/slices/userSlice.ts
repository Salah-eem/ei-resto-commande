import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/src/types";

interface UserState {
  profile: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<User>) => {
      state.profile = action.payload;
    },
    clearUserProfile: (state) => {
      state.profile = null;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setUserProfile,
  clearUserProfile,
  updateUserProfile,
  setLoading,
  setError,
} = userSlice.actions;
export default userSlice.reducer;
