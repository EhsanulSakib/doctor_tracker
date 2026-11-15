"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { breadcrumbTailSet } from "@/store/slices/ui";

/**
 * Rendered by a detail page to add its own name to the top bar breadcrumb
 * (`Doctor Tracker › Doctors › Dr. Nusrat Jahan`). Cleared when the page goes away.
 */
export function BreadcrumbTail({ label }: { label: string }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(breadcrumbTailSet(label));
    return () => {
      dispatch(breadcrumbTailSet(null));
    };
  }, [dispatch, label]);
  return null;
}
