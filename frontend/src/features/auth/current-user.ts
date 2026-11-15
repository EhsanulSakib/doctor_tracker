import "server-only";
import { cache } from "react";
import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiData, PublicUser } from "@/lib/api/types";

/**
 * The signed-in admin, from `GET /api/auth/me`. `cache` dedupes it within one request, so the shell
 * and a page can both ask without a second API call. Reads cookies: call it inside <Suspense>.
 * No session → serverFetch redirects to /login.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser> => {
  const { data } = await serverFetch<ApiData<{ user: PublicUser }>>("/auth/me");
  return data.user;
});
