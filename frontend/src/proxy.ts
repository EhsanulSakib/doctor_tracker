import { decodeJwt } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, HOME_PATH, LOGIN_PATH, REFRESH_COOKIE, safeNextPath } from "@/lib/auth/session";

/**
 * Runs before every page render (Next 16's replacement for middleware.ts).
 *
 *  /login with a live session ............ → redirect to ?next= (or /dashboard)
 *  protected page, no refresh cookie ..... → redirect to /login?next=<page>
 *  access token valid for > 30 s ......... → continue
 *  otherwise ............................. → POST /api/auth/refresh with the refresh cookie
 *      200 → forward the rotated cookies to the browser AND into this request, so the
 *            Server Components rendering right now already see the new access token
 *      401 → clear both cookies, redirect to /login?next=<page>
 *
 * The proxy only decides WHEN to refresh: it reads the token's `exp` without verifying the
 * signature (the frontend has no secret). The API still verifies every request.
 */

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8082").replace(/\/+$/, "");

/** Refresh a little before expiry, so a token can't expire mid-render. */
const REFRESH_MARGIN_MS = 30_000;

function isFresh(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const { exp } = decodeJwt(accessToken);
    return typeof exp === "number" && exp * 1000 - Date.now() > REFRESH_MARGIN_MS;
  } catch {
    return false; // malformed: treat as missing and refresh
  }
}

type RefreshResult = { status: "ok"; setCookies: string[] } | { status: "invalid" } | { status: "unavailable" };

async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", Cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      cache: "no-store",
    });
    if (res.ok) return { status: "ok", setCookies: res.headers.getSetCookie() };
    // 401 = expired / revoked session. Anything else (429, 5xx) is a temporary problem.
    return res.status === 401 ? { status: "invalid" } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

/** `name=value` pairs from Set-Cookie headers (the attributes after `;` don't matter here). */
function cookieValues(setCookies: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const header of setCookies) {
    const pair = header.split(";", 1)[0] ?? "";
    const separator = pair.indexOf("=");
    if (separator > 0) values.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
  }
  return values;
}

/** The incoming request's headers with its Cookie header updated to the freshly rotated tokens. */
function headersWithCookies(request: NextRequest, fresh: Map<string, string>): Headers {
  const cookies = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  for (const [name, value] of fresh) cookies.set(name, value);

  const headers = new Headers(request.headers);
  headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  return headers;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = new URL(LOGIN_PATH, request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/" && pathname !== HOME_PATH) url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

function redirectAfterLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url));
}

export async function proxy(request: NextRequest) {
  const onLoginPage = request.nextUrl.pathname === LOGIN_PATH;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (isFresh(accessToken)) return onLoginPage ? redirectAfterLogin(request) : NextResponse.next();
  if (!refreshToken) return onLoginPage ? NextResponse.next() : redirectToLogin(request);

  const result = await refreshSession(refreshToken);

  // API unreachable: don't sign the user out over a hiccup. The page renders and its data calls
  // fail into the error boundary, which offers "Try again".
  if (result.status === "unavailable") return NextResponse.next();

  if (result.status === "invalid") {
    const response = onLoginPage ? NextResponse.next() : redirectToLogin(request);
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = onLoginPage
    ? redirectAfterLogin(request)
    : NextResponse.next({ request: { headers: headersWithCookies(request, cookieValues(result.setCookies)) } });
  // Pass the API's Set-Cookie headers through unchanged (httpOnly, SameSite=Lax, Max-Age, Secure in prod).
  for (const cookie of result.setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API rewrite (the API checks its own auth), Next's assets, or files with an extension.
      source: "/((?!api/|_next/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)",
      // Link prefetches skip the proxy: with Partial Prefetching they only fetch a route's static shell,
      // which holds no user data, so they need no session (and shouldn't spend a token refresh).
      // Must be done here: Next strips the router's prefetch header from `request` inside the proxy.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
