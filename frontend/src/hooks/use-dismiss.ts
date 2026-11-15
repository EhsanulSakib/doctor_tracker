"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onDismiss` when the user presses the pointer outside every element in `refs`
 * (e.g. the trigger and its floating panel). Escape is handled by each component, because only it
 * knows whether the key was already used (an open listbox inside a dialog closes first).
 */
export function useDismiss(open: boolean, refs: RefObject<HTMLElement | null>[], onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismissRef.current();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // refs is a list of stable ref objects; re-subscribing on each render isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
