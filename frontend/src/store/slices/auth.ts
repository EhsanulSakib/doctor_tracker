import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PublicUser } from "@/lib/api/types";

type AuthState = { user: PublicUser | null };

const initialState: AuthState = { user: null };

/**
 * The signed-in admin, for client components that need it (mobile drawer, greetings).
 * Filled from the server-rendered `/api/auth/me` result by <AuthHydrator>, never fetched here.
 */
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userLoaded(state, action: PayloadAction<PublicUser>) {
      state.user = action.payload;
    },
    userCleared(state) {
      state.user = null;
    },
  },
  selectors: {
    selectUser: (state) => state.user,
  },
});

export const { userLoaded, userCleared } = authSlice.actions;
export const { selectUser } = authSlice.selectors;
