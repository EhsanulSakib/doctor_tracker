"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { LogOutIcon, PanelLeftIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { transitions } from "@/lib/motion";
import { applySidebarCollapsed, readSidebarCollapsed } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth";
import { sidebarCollapsedSet } from "@/store/slices/ui";
import { BrandMark } from "./brand";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { initialsOf } from "./user-menu";

const ROLE_LABELS: Record<string, string> = { admin: "Admin" };

/**
 * Desktop/tablet navigation. Width: icon rail (64px) on tablets; 240px from `lg`, collapsible to the
 * rail with the button next to the logo (collapsed, the logo itself turns into the expand button on
 * hover / focus). Collapsing is driven by `data-sidebar` on <html> (set before paint from the saved
 * choice), so the layout never jumps; labels stay in the DOM as screen-reader text when collapsed.
 * The signed-in admin sits at the bottom, with sign out.
 */
export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useSidebarCollapsed();

  const toggle = () => {
    const next = !readSidebarCollapsed();
    applySidebarCollapsed(next);
    dispatch(sidebarCollapsedSet(next));
  };

  return (
    <aside
      id="sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-sidebar-rail flex-col border-r border-line bg-surface transition-[width] duration-200 ease-clinical md:flex lg:w-sidebar lg:sidebar-collapsed:w-sidebar-rail"
    >
      <div className="flex h-topbar shrink-0 items-center gap-2 border-b border-line px-3 lg:sidebar-collapsed:justify-center">
        {/* The brand: always on tablets (mark only); on laptops while the sidebar is open. */}
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-control px-1 focus-ring lg:sidebar-collapsed:hidden">
          <BrandMark />
          <span className="hidden truncate text-lead font-semibold tracking-tight text-ink lg:inline">Doctor Tracker</span>
          <span className="sr-only lg:hidden">Doctor Tracker home</span>
        </Link>
        <IconButton
          label="Collapse sidebar"
          icon={<PanelLeftIcon size={18} />}
          onClick={toggle}
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          className="ml-auto hidden lg:inline-flex lg:sidebar-collapsed:hidden"
        />
        {/* Collapsed: the logo is the expand button (shows the panel icon on hover / keyboard focus). */}
        <button
          type="button"
          onClick={toggle}
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="group hidden size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring lg:sidebar-collapsed:flex"
        >
          <BrandMark className="group-hover:hidden group-focus-visible:hidden" />
          <PanelLeftIcon size={18} className="hidden group-hover:block group-focus-visible:block" />
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors focus-ring",
                    "justify-center lg:justify-start lg:sidebar-collapsed:justify-center",
                    active ? "text-accent-fg" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
                  )}
                >
                  {/* Slides between items on navigation (shared layout animation). */}
                  {active && <m.span layoutId="sidebar-active" className="absolute inset-0 rounded-control bg-accent-soft" transition={transitions.slow} />}
                  <Icon size={18} className="relative shrink-0" />
                  {/* The wrapper keeps the label above the highlight: `not-sr-only` resets position to static. */}
                  <span className="relative">
                    <span className="sr-only lg:not-sr-only lg:sidebar-collapsed:sr-only">{label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SidebarProfile />
    </aside>
  );
}

/**
 * The signed-in admin: avatar, name and role tag, and sign out. The user arrives with the streamed
 * account menu (it fills the auth store); until then the name and tag are skeletons of the same size.
 * Sign out works either way. Rail (tablet / collapsed): avatar and sign-out stacked.
 */
function SidebarProfile() {
  const user = useAppSelector(selectUser);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="shrink-0 border-t border-line p-3">
      <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-2.5 lg:sidebar-collapsed:flex-col lg:sidebar-collapsed:gap-2">
        {user ? (
          <span
            title={`${user.name} (${ROLE_LABELS[user.role] ?? user.role})`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-fg"
          >
            <span aria-hidden>{initialsOf(user.name)}</span>
          </span>
        ) : (
          <Skeleton className="size-9 shrink-0 rounded-full" />
        )}

        <div className="hidden min-w-0 flex-1 lg:block lg:sidebar-collapsed:hidden">
          {user ? (
            <>
              <p className="truncate text-ui leading-5 font-medium text-ink">{user.name}</p>
              <span className="mt-0.5 inline-flex h-5 items-center rounded-tag bg-accent-soft px-1.5 text-caption font-semibold tracking-wide text-accent-fg uppercase">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </>
          ) : (
            <>
              <div className="flex h-5 items-center">
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="mt-0.5 h-5 w-12 rounded-tag" />
            </>
          )}
        </div>
        {user && <span className="sr-only">Signed in as {user.name}</span>}

        <IconButton
          label="Sign out"
          icon={<LogOutIcon size={17} />}
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await logout();
          }}
          className="rounded-full hover:text-danger"
        />
      </div>
    </div>
  );
}
