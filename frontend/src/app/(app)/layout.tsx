import { Suspense, type ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { UserMenuSkeleton } from "@/components/layout/user-menu";
import { CurrentUserMenu } from "@/features/auth/current-user-menu";

/**
 * The protected app shell. proxy.ts has already checked the session before this renders.
 * Everything here is static (prerendered, instant on navigation) except the account menu, which
 * reads the session and streams in behind <Suspense>; pages stream into <main> behind loading.tsx.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-80 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-overlay focus:outline-2 focus:outline-accent"
      >
        Skip to main content
      </a>

      <Sidebar />

      {/* Phones / tablets: normal window scrolling. lg and up: exactly one viewport tall, no window
          scrollbar; only <main> scrolls (thin scrollbar) if a page is ever taller than the screen. */}
      <div className="flex min-h-dvh flex-col transition-[padding] duration-200 ease-clinical md:pl-16 lg:h-dvh lg:pl-60 lg:sidebar-collapsed:pl-16">
        <Topbar
          userSlot={
            <Suspense fallback={<UserMenuSkeleton />}>
              <CurrentUserMenu />
            </Suspense>
          }
        />
        <main
          id="main"
          tabIndex={-1}
          className="flex w-full flex-1 flex-col px-4 py-5 outline-none scrollbar-thin sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:py-6"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </>
  );
}
