"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { PreferencesSync } from "@/components/layout/preferences-sync";
import { Toaster } from "@/components/ui/toaster";
import { StoreProvider } from "@/store/provider";

// The animation engine loads after the first paint instead of shipping in the initial bundle.
const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      {/* strict: only the lightweight `m.*` components are allowed (keeps the bundle small). */}
      <LazyMotion features={loadMotionFeatures} strict>
        {/* Honors the OS "reduce motion" setting: transforms are skipped, fades remain. */}
        <MotionConfig reducedMotion="user">
          {/* Overlays portal next to this element; a modal makes it `inert` (see components/ui/dialog.tsx). */}
          <div id="app-root" className="isolate min-h-dvh">
            {children}
          </div>
          <Toaster />
          <PreferencesSync />
        </MotionConfig>
      </LazyMotion>
    </StoreProvider>
  );
}
