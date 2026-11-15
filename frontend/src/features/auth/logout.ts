import { clientFetch } from "@/lib/api/client-fetch";
import { LOGIN_PATH } from "@/lib/auth/session";

/** Ends the session on the API (revokes the refresh token, clears both cookies), then leaves for /login. */
export async function logout(): Promise<void> {
  try {
    await clientFetch<void>("/auth/logout", { method: "POST" });
  } catch {
    // Already signed out, or offline: leaving is still the right outcome.
  }
  // A full page load on purpose: drops every bit of client state (Redux, router cache) with the session.
  window.location.assign(LOGIN_PATH);
}
