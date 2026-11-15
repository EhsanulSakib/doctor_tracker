"use client";

import { useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/slices/toast";

/** `const toast = useToast(); toast.success("Doctor saved")`. Rendered by <Toaster />. */
export function useToast() {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      success: (title: string, description?: string) => dispatch(toastAdded({ tone: "success", title, description })),
      error: (title: string, description?: string) => dispatch(toastAdded({ tone: "error", title, description })),
      info: (title: string, description?: string) => dispatch(toastAdded({ tone: "info", title, description })),
    }),
    [dispatch],
  );
}
