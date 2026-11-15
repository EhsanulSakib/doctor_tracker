"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { MenuIcon } from "@/components/ui/icons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { mobileNavSet, selectMobileNavOpen } from "@/store/slices/ui";
import { BrandMark } from "./brand";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/**
 * Top bar: menu button + brand on phones, breadcrumb from `md`, theme toggle and account menu.
 * `userSlot` is server-rendered (it streams in once /api/auth/me answers).
 */
export function Topbar({ userSlot }: { userSlot: ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const mobileNavOpen = useAppSelector(selectMobileNavOpen);
  const section = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper px-3 sm:px-6 lg:px-8">
      <IconButton
        label="Open navigation"
        icon={<MenuIcon size={20} />}
        className="md:hidden"
        aria-expanded={mobileNavOpen}
        aria-haspopup="dialog"
        onClick={() => dispatch(mobileNavSet(true))}
      />
      <Link href="/dashboard" className="flex items-center gap-2 rounded-control focus-ring md:hidden">
        <BrandMark className="size-7" />
        <span className="text-[15px] font-semibold tracking-tight">Doctor Tracker</span>
      </Link>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
        <ol className="flex items-center gap-2 text-sm">
          <li className="text-ink-muted">Doctor Tracker</li>
          {section && (
            <>
              <li aria-hidden className="text-ink-subtle">
                /
              </li>
              <li className="truncate font-medium text-ink" aria-current="page">
                {section.label}
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        {userSlot}
      </div>
    </header>
  );
}
