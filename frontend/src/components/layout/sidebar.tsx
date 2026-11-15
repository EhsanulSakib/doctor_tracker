"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftIcon } from "@/components/ui/icons";
import { transitions } from "@/lib/motion";
import { applySidebarCollapsed, readSidebarCollapsed } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSidebarCollapsed, sidebarCollapsedSet } from "@/store/slices/ui";
import { BrandMark } from "./brand";
import { isActivePath, NAV_ITEMS } from "./nav-items";

/**
 * Desktop/tablet navigation. Width: icon rail (64px) on tablets; 240px from `lg`, collapsible to the
 * rail. Collapsing is driven by `data-sidebar` on <html> (set before paint from the saved choice), so
 * the layout never jumps; labels stay in the DOM as screen-reader text when collapsed.
 */
export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);

  const toggle = () => {
    const next = !readSidebarCollapsed();
    applySidebarCollapsed(next);
    dispatch(sidebarCollapsedSet(next));
  };

  return (
    <aside
      id="sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-clinical md:flex lg:w-60 lg:sidebar-collapsed:w-16"
    >
      <Link href="/dashboard" className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4 focus-ring">
        <BrandMark />
        <span className="hidden truncate text-[15px] font-semibold tracking-tight lg:inline lg:sidebar-collapsed:hidden">Doctor Tracker</span>
        <span className="sr-only lg:hidden">Doctor Tracker home</span>
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 hidden px-2.5 text-label font-medium uppercase text-ink-subtle lg:block lg:sidebar-collapsed:hidden">Workspace</p>
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
                    "relative flex h-10 items-center gap-3 rounded-control px-2.5 text-sm font-medium transition-colors focus-ring",
                    "justify-center lg:justify-start lg:sidebar-collapsed:justify-center",
                    active ? "text-accent" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
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

      <div className="hidden border-t border-line p-3 lg:block">
        <button
          type="button"
          onClick={toggle}
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          className="flex h-9 w-full items-center gap-3 rounded-control px-2.5 text-sm text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring lg:sidebar-collapsed:justify-center"
        >
          <PanelLeftIcon size={18} className="shrink-0" />
          <span className="sidebar-collapsed:sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </button>
      </div>
    </aside>
  );
}
