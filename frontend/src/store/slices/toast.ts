import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastTone = "success" | "error" | "info";

export type Toast = { id: string; tone: ToastTone; title: string; description?: string };

/** Older toasts are dropped beyond this, so a burst of errors can't fill the screen. */
const MAX_TOASTS = 4;

export const toastSlice = createSlice({
  name: "toast",
  initialState: [] as Toast[],
  reducers: {
    toastAdded: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload);
        if (state.length > MAX_TOASTS) state.shift();
      },
      prepare: (toast: Omit<Toast, "id">) => ({ payload: { ...toast, id: nanoid() } }),
    },
    toastDismissed(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
  selectors: {
    selectToasts: (state) => state,
  },
});

export const { toastAdded, toastDismissed } = toastSlice.actions;
export const { selectToasts } = toastSlice.selectors;
