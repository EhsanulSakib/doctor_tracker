import type { Transition, Variants } from "motion/react";

/**
 * Shared motion language: short (150–250 ms), decelerating, and subtle. Exits are faster than
 * entrances. With "reduce motion" on, <MotionConfig reducedMotion="user"> (app/providers.tsx) drops
 * the transforms and keeps only the opacity fades.
 */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

export const transitions = {
  fast: { duration: 0.15, ease: EASE_OUT },
  base: { duration: 0.2, ease: EASE_OUT },
  slow: { duration: 0.25, ease: EASE_OUT },
  exit: { duration: 0.12, ease: EASE_IN },
} satisfies Record<string, Transition>;

/** Overlays and backdrops. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: transitions.exit },
};

/** Dialogs, popovers and listboxes: a small lift and scale. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitions.base },
  exit: { opacity: 0, y: 4, scale: 0.98, transition: transitions.exit },
};

/** Toasts: rise in, slide out to the side. */
export const toastMotion: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitions.slow },
  exit: { opacity: 0, x: 24, transition: transitions.exit },
};

/** Table rows / cards: a quick stagger (capped by the number of rows on a page). */
export const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.02, delayChildren: 0.02 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
};
