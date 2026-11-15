"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";
import { LogOutIcon, XIcon } from "@/components/ui/icons";
import { logout } from "@/features/auth/logout";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth";
import { mobileNavSet, selectMobileNavOpen } from "@/store/slices/ui";
import { BrandMark } from "./brand";
import { isActivePath, NAV_ITEMS } from "./nav-items";
import { initialsOf } from "./user-menu";

/** Phone navigation drawer (below `md`). Closes on navigation, Escape, backdrop tap. */
export function MobileNav() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectMobileNavOpen);
  const user = useAppSelector(selectUser);
  const [signingOut, setSigningOut] = useState(false);
  const close = () => dispatch(mobileNavSet(false));

  // Also covers back/forward navigation, not just taps on the links.
  useEffect(() => {
    dispatch(mobileNavSet(false));
  }, [pathname, dispatch]);

  return (
    <Drawer open={open} onClose={close} label="Navigation">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">Doctor Tracker</span>
        </div>
        <IconButton label="Close navigation" icon={<XIcon size={18} />} onClick={close} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors focus-ring",
                    active ? "bg-accent-soft text-accent-fg" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
                  )}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {user && (
        <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center gap-3">
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-fg">
              {initialsOf(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            fullWidth
            icon={<LogOutIcon />}
            loading={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await logout();
            }}
          >
            Sign out
          </Button>
        </div>
      )}
    </Drawer>
  );
}
