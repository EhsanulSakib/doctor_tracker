"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, ChevronDownIcon, LogOutIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import type { PublicUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One fixed-size box for the trigger, its loading skeleton and its fallback: the account menu streams in
 * after the shell, and a size change would push the theme toggle sideways (layout shift).
 * Phones: a square avatar button. From `sm`, 176px with avatar, name (truncated) and chevron.
 */
const TRIGGER_BOX =
  "flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-control pointer-coarse:h-11 pointer-coarse:w-11 " +
  "sm:w-44 sm:justify-start sm:pl-1 sm:pr-2 sm:pointer-coarse:w-44";

/** "Nusrat Jahan" → "NJ". */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

export function UserMenu({ user }: { user: PublicUser }) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Popover
      label="Account"
      align="end"
      className="w-64 p-0"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`Account: ${user.name}`}
          className={cn(TRIGGER_BOX, "transition-colors hover:bg-paper-2 focus-ring")}
        >
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-fg">
            {initialsOf(user.name)}
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-medium text-ink sm:block">{user.name}</span>
          <ChevronDownIcon className="hidden shrink-0 text-ink-subtle sm:block" />
        </button>
      )}
    >
      <div className="border-b border-line p-3.5">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-ui text-ink-muted">{user.email}</p>
        <span className="mt-2 inline-flex h-5 items-center rounded-tag bg-accent-soft px-1.5 text-caption font-semibold tracking-wide text-accent-fg uppercase">
          Admin
        </span>
      </div>
      <div className="p-1.5">
        <Button
          variant="ghost"
          fullWidth
          className="justify-start"
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
    </Popover>
  );
}

/** When /api/auth/me fails for a reason other than a dead session: signing out still works. */
export function UserMenuFallback() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Popover
      label="Account"
      align="end"
      className="w-64"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label="Account (details unavailable)"
          className={cn(TRIGGER_BOX, "transition-colors hover:bg-paper-2 focus-ring")}
        >
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <AlertTriangleIcon size={15} />
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-medium text-ink sm:block">Account</span>
          <ChevronDownIcon className="hidden shrink-0 text-ink-subtle sm:block" />
        </button>
      )}
    >
      <p className="text-sm text-ink">Couldn&apos;t load your account.</p>
      <Button
        variant="secondary"
        fullWidth
        className="mt-3"
        icon={<LogOutIcon />}
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await logout();
        }}
      >
        Sign out
      </Button>
    </Popover>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className={TRIGGER_BOX} aria-hidden>
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <Skeleton className="hidden h-3.5 flex-1 sm:block" />
      <span className="hidden size-4 shrink-0 sm:block" />
    </div>
  );
}
