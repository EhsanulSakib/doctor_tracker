"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, ChevronDownIcon, LogOutIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import type { PublicUser } from "@/lib/api/types";

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
          className="flex h-9 items-center gap-2 rounded-control pl-1 pr-1.5 transition-colors hover:bg-paper-2 focus-ring pointer-coarse:h-11 sm:pr-2"
        >
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            {initialsOf(user.name)}
          </span>
          <span className="hidden max-w-36 truncate text-sm font-medium text-ink sm:block">{user.name}</span>
          <ChevronDownIcon className="hidden text-ink-subtle sm:block" />
        </button>
      )}
    >
      <div className="border-b border-line p-3.5">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
        <Badge tone="accent" className="mt-2.5">
          Administrator
        </Badge>
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
          className="flex size-9 items-center justify-center rounded-control text-warning transition-colors hover:bg-paper-2 focus-ring pointer-coarse:size-11"
        >
          <AlertTriangleIcon size={18} />
        </button>
      )}
    >
      <p className="text-sm text-ink">Your account details couldn&apos;t be loaded.</p>
      <p className="mt-1 text-[13px] text-ink-muted">The server may be unavailable. Refresh in a moment.</p>
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
    <div className="flex h-9 items-center gap-2 px-1" aria-hidden>
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="hidden h-3.5 w-24 sm:block" />
    </div>
  );
}
