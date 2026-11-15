"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

/**
 * Creates the store once per mount. A module-level store would be shared between requests on the
 * server (one user's state leaking into another's render); this is the App Router-safe pattern.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
