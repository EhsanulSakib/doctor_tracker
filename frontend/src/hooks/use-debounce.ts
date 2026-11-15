"use client";

import { useEffect, useMemo, useRef } from "react";

export type DebouncedFn<A extends unknown[]> = ((...args: A) => void) & {
  /** Runs the pending call now. */
  flush: () => void;
  /** Drops the pending call. */
  cancel: () => void;
};

/**
 * Returns a stable function that runs `callback` only after `delay` ms without new calls
 * (search inputs: one request when the user pauses typing, not one per keystroke).
 * Always calls the latest `callback`, and cancels on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(callback: (...args: A) => void, delay: number): DebouncedFn<A> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingArgsRef = useRef<A | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useMemo(() => {
    const run = () => {
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;
      if (args) callbackRef.current(...args);
    };

    const debounced = (...args: A) => {
      pendingArgsRef.current = args;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, delay);
    };
    debounced.flush = () => {
      clearTimeout(timerRef.current);
      run();
    };
    debounced.cancel = () => {
      clearTimeout(timerRef.current);
      pendingArgsRef.current = null;
    };
    return debounced;
  }, [delay]);
}
