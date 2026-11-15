import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./slices/auth";
import { toastSlice } from "./slices/toast";
import { uiSlice } from "./slices/ui";

/**
 * Redux holds UI state only (sidebar, theme, open dialog, toasts) and the signed-in user.
 * Server data comes from Server Components and the URL, so it is never copied into the store.
 */
const rootReducer = combineSlices(uiSlice, toastSlice, authSlice);

/** A new store per request on the server and one per tab in the browser (see provider.tsx). */
export const makeStore = () => configureStore({ reducer: rootReducer });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
