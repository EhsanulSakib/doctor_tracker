// Shared by proxy.ts (edge of every page request), serverFetch and the login form.

/** Cookie names set by the API (backend/src/modules/auth/cookies.ts). Both are httpOnly. */
export const ACCESS_COOKIE = "dt_access";
export const REFRESH_COOKIE = "dt_refresh";

/** Where a signed-in user lands by default. */
export const HOME_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

/**
 * Accepts `?next=` only if it's a path on this site, so the login page can't be turned into an
 * open redirect (`?next=https://evil.example` or `//evil.example` fall back to the dashboard).
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return HOME_PATH;
  try {
    const url = new URL(value, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return HOME_PATH;
    if (url.pathname === LOGIN_PATH) return HOME_PATH;
    return `${url.pathname}${url.search}`;
  } catch {
    return HOME_PATH;
  }
}
