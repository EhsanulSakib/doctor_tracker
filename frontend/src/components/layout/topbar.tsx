"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronRightIcon, MenuIcon } from "@/components/ui/icons";
import { WorldClock } from "@/features/clock/world-clock";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { mobileNavSet, selectBreadcrumbTail, selectMobileNavOpen } from "@/store/slices/ui";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/**
 * Top bar. Left: where you are (breadcrumb from `md`; menu button + page name on phones, since pages
 * have no visible title). Right: clock and calendar, notifications, theme, account.
 * Every item on the right has a fixed size, so nothing moves while the clock, the unread count and
 * the account menu (server-rendered `userSlot`, streamed after /api/auth/me) fill in.
 */
export function Topbar({ userSlot }: { userSlot: ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const mobileNavOpen = useAppSelector(selectMobileNavOpen);
  const section = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
  // Only on a page below the section (e.g. /doctors/:id), and only once that page has set it.
  const tail = useAppSelector(selectBreadcrumbTail);
  const detail = section && pathname !== section.href ? tail : null;

  return (
    <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-5 lg:px-6">
      <IconButton
        label="Open navigation"
        icon={<MenuIcon size={20} />}
        className="md:hidden"
        aria-expanded={mobileNavOpen}
        aria-haspopup="dialog"
        onClick={() => dispatch(mobileNavSet(true))}
      />
      {section && <p className="min-w-0 truncate text-lead font-semibold tracking-tight text-ink md:hidden">{detail ?? section.label}</p>}

      <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
        <ol className="flex items-center gap-1.5 text-ui">
          <li>
            <Link href="/dashboard" className="rounded-sm font-medium text-ink-muted transition-colors hover:text-ink focus-ring">
              Doctor Tracker
            </Link>
          </li>
          {section && (
            <>
              <li aria-hidden className="text-ink-subtle">
                <ChevronRightIcon size={14} />
              </li>
              {detail ? (
                <>
                  <li>
                    <Link href={section.href} className="rounded-sm font-medium whitespace-nowrap text-ink-muted transition-colors hover:text-ink focus-ring">
                      {section.label}
                    </Link>
                  </li>
                  <li aria-hidden className="text-ink-subtle">
                    <ChevronRightIcon size={14} />
                  </li>
                  <li className="min-w-0 truncate font-semibold text-ink" aria-current="page">
                    {detail}
                  </li>
                </>
              ) : (
                <li className="truncate font-semibold text-ink" aria-current="page">
                  {section.label}
                </li>
              )}
            </>
          )}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <WorldClock />
        <NotificationBell />
        <ThemeToggle />
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />
        {userSlot}
      </div>
    </header>
  );
}
