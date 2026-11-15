import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Theme } from "@/lib/preferences";

export type { Theme };

/** Which feature dialog is open, e.g. `{ id: "doctor-form", entityId: "…" }` (null = none). */
export type DialogDescriptor = { id: string; entityId?: string };

type UiState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: Theme;
  dialog: DialogDescriptor | null;
};

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileNavOpen: false,
  theme: "light",
  dialog: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    sidebarCollapsedSet(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    mobileNavSet(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    themeSet(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    dialogOpened(state, action: PayloadAction<DialogDescriptor>) {
      state.dialog = action.payload;
    },
    dialogClosed(state) {
      state.dialog = null;
    },
  },
  selectors: {
    selectSidebarCollapsed: (state) => state.sidebarCollapsed,
    selectMobileNavOpen: (state) => state.mobileNavOpen,
    selectTheme: (state) => state.theme,
    selectDialog: (state) => state.dialog,
  },
});

export const { sidebarToggled, sidebarCollapsedSet, mobileNavSet, themeSet, dialogOpened, dialogClosed } = uiSlice.actions;
export const { selectSidebarCollapsed, selectMobileNavOpen, selectTheme, selectDialog } = uiSlice.selectors;
