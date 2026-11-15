import { unstable_rethrow } from "next/navigation";
import { UserMenu, UserMenuFallback } from "@/components/layout/user-menu";
import type { PublicUser } from "@/lib/api/types";
import { AuthHydrator } from "./auth-hydrator";
import { getCurrentUser } from "./current-user";

/**
 * Server Component behind <Suspense> in the app layout: the shell renders immediately and the
 * account menu streams in when /api/auth/me answers (Cache Components: session reads never block
 * the static shell).
 *
 * If the API is unreachable, only this menu degrades: an error here would otherwise escape the
 * layout and replace the whole shell with the root error page.
 */
export async function CurrentUserMenu() {
  let user: PublicUser;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Let Next's own control flow through (redirect to /login on 401, prerender bail-outs).
    unstable_rethrow(error);
    console.error("Could not load the current user", error);
    return <UserMenuFallback />;
  }

  return (
    <>
      <AuthHydrator user={user} />
      <UserMenu user={user} />
    </>
  );
}
