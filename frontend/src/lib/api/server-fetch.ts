import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, LOGIN_PATH } from "@/lib/auth/session";
import { toQueryString, type QueryParams } from "@/lib/utils";
import { ApiError } from "./errors";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8082").replace(/\/+$/, "");

/**
 * Calls the API from a Server Component, forwarding the user's access token.
 *
 * - `path` is relative to `/api` (`serverFetch('/doctors', { searchParams })`).
 * - Always fresh (`no-store`): admin data must reflect the latest writes.
 * - It reads cookies, so with Cache Components the caller must sit inside a `<Suspense>` boundary
 *   (or a route with `loading.tsx`); the static shell around it still prerenders.
 * - 401: proxy.ts refreshes sessions before rendering, so this is only the backstop → /login.
 */
export async function serverFetch<T>(path: string, init: { searchParams?: QueryParams } = {}): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;

  const res = await fetch(`${BACKEND_URL}/api${path}${toQueryString(init.searchParams)}`, {
    headers: { Accept: "application/json", ...(token && { Cookie: `${ACCESS_COOKIE}=${token}` }) },
    cache: "no-store",
  });

  if (res.status === 401) redirect(LOGIN_PATH);
  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
