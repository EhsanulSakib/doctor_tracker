"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronsLeftIcon, ChevronsRightIcon, LogOutIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { atLeast } from "@/lib/breakpoints";
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
import { PROFILE_PATH, ROLE_LABELS } from "./user-menu";


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
  // Icons only (tablets, or collapsed on a laptop): the labels move into tooltips.
  const isLaptop = useMediaQuery(atLeast("lg"));
  const rail = !isLaptop || collapsed;

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
        <Tooltip content="Collapse sidebar" side="right" className="ml-auto hidden lg:inline-flex lg:sidebar-collapsed:hidden">
          <IconButton label="Collapse sidebar" title="" icon={<ChevronsLeftIcon size={18} />} onClick={toggle} aria-controls="sidebar" aria-expanded={!collapsed} />
        </Tooltip>
        {/* Collapsed: the logo is the expand button (shows the double arrow on hover / keyboard focus). */}
        <Tooltip content="Expand sidebar" side="right" className="hidden lg:sidebar-collapsed:inline-flex">
          <button
            type="button"
            onClick={toggle}
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            aria-label="Expand sidebar"
            className="group flex size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring"
          >
            <BrandMark className="group-hover:hidden group-focus-visible:hidden" />
            <ChevronsRightIcon size={18} className="hidden group-hover:block group-focus-visible:block" />
          </button>
        </Tooltip>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Tooltip content={label} side="right" enabled={rail} className="flex">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 flex-1 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors focus-ring",
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
                </Tooltip>
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
 * The signed-in admin: avatar, name and role tag (a link to /profile), and sign out. The user arrives with the streamed
 * account menu (it fills the auth store); until then the name and tag are skeletons of the same size.
 * Sign out works either way. Rail (tablet / collapsed): avatar and sign-out stacked.
 */
function SidebarProfile() {
  const user = useAppSelector(selectUser);
  const onProfile = usePathname() === PROFILE_PATH;
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="shrink-0 border-t border-line p-3">
      <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-2.5 lg:sidebar-collapsed:flex-col lg:sidebar-collapsed:gap-2">
        {user ? (
          <Link
            href={PROFILE_PATH}
            aria-current={onProfile ? "page" : undefined}
            data-tooltip={`${user.name} · ${ROLE_LABELS[user.role] ?? user.role}`}
            data-tooltip-side="right"
            className={cn(
              "group -m-1 flex min-w-0 items-center gap-2.5 rounded-control p-1 transition-colors hover:bg-paper-2 focus-ring lg:flex-1 lg:sidebar-collapsed:flex-none",
              onProfile && "bg-paper-2",
            )}
          >
            <Avatar name={user.name} src={user.avatarUrl} size={36} className="ring-accent/40 transition group-hover:ring-2" />
            <span className="hidden min-w-0 flex-1 lg:block lg:sidebar-collapsed:hidden">
              <span className="block truncate text-ui leading-5 font-medium text-ink">{user.name}</span>
              <span className="mt-0.5 inline-flex h-5 items-center rounded-tag bg-accent-soft px-1.5 text-caption font-semibold tracking-wide text-accent-fg uppercase">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <span className="sr-only">Signed in as {user.name}. Open profile</span>
          </Link>
        ) : (
          <>
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="hidden min-w-0 flex-1 lg:block lg:sidebar-collapsed:hidden">
              <div className="flex h-5 items-center">
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="mt-0.5 h-5 w-12 rounded-tag" />
            </div>
          </>
        )}

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
