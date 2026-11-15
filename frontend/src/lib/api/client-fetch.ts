import { toQueryString, type QueryParams } from "@/lib/utils";
import { ApiError, READ_ONLY_EVENT } from "./errors";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ClientFetchInit = {
  method?: Method;
  /** Serialized as JSON. */
  body?: unknown;
  searchParams?: QueryParams;
  signal?: AbortSignal;
};

// Auth endpoints answer 401 for their own reasons (wrong password, dead session): never refresh on them.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Single-flight refresh: if several requests hit 401 at once, they all wait for ONE refresh call
 * instead of racing (the backend rotates the refresh token on every use).
 */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  // A full page load on purpose: the session is gone, so all client state (Redux, router cache) is dropped too.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

async function send(path: string, init: ClientFetchInit): Promise<Response> {
  try {
    return await fetch(`/api${path}${toQueryString(init.searchParams)}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined && { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
  }
}

/**
 * Calls the API from the browser via the same-origin `/api` rewrite (httpOnly cookies ride along).
 * On 401 it refreshes the session once and retries; if that fails, it sends the user to /login and
 * returns to the current page afterwards. Throws `ApiError` for every other failure.
 */
export async function clientFetch<T>(path: string, init: ClientFetchInit = {}): Promise<T> {
  let res = await send(path, init);

  if (res.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    if (await refreshSession()) res = await send(path, init);
    if (res.status === 401) {
      redirectToLogin();
      throw await ApiError.fromResponse(res);
    }
  }

  if (!res.ok) {
    const error = await ApiError.fromResponse(res);
    // Demo account writing: one place announces it (a toast via <Toaster>), whichever screen asked.
    if (error.code === "DEMO_READ_ONLY") window.dispatchEvent(new CustomEvent(READ_ONLY_EVENT, { detail: error.message }));
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
