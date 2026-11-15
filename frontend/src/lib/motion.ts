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

/** A short, well-damped spring for things that open from a trigger (no visible bounce). */
const SNAP = { type: "spring", stiffness: 560, damping: 38, mass: 0.7 } as const;

/** Dialogs and popovers: scale up from the trigger's side (transform-origin set by useAnchoredPosition). */
export const popIn: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SNAP },
  exit: { opacity: 0, y: -2, scale: 0.97, transition: transitions.exit },
};

/** Phones: dialogs are bottom sheets that slide up from the edge (and back down). */
export const sheetUp: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", stiffness: 420, damping: 40, mass: 0.8 } },
  exit: { y: "100%", transition: { duration: 0.2, ease: EASE_IN } },
};

/** Dropdown lists: the panel opens like a popover, then its options cascade in (a few ms apart). */
export const menuPanel: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...SNAP, staggerChildren: 0.018, delayChildren: 0.02 } },
  exit: { opacity: 0, y: -2, scale: 0.97, transition: transitions.exit },
};

export const menuItem: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: transitions.fast },
};

/** The highlight that slides between options as you hover or arrow through them. */
export const highlightSpring = { type: "spring", stiffness: 700, damping: 45, mass: 0.6 } as const;

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
