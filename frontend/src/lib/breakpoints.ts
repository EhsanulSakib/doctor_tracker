/**
 * Tailwind's default breakpoints in px (sm 40rem, md 48rem, lg 64rem, xl 80rem at a 16px root), for the
 * few places JavaScript needs a media query. CSS uses the `sm:` / `md:` / `lg:` / `xl:` variants instead.
 */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Narrower than the breakpoint: the same range as Tailwind's `max-sm:` etc. */
export const below = (breakpoint: Breakpoint) => `(width < ${BREAKPOINTS[breakpoint]}px)`;

/** The breakpoint and wider: the same range as `sm:` etc. Also valid in an image's `sizes`. */
export const atLeast = (breakpoint: Breakpoint) => `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
