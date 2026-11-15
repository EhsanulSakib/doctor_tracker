"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, ChevronDownIcon, EyeIcon, LogOutIcon, PencilIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import type { PublicUser, UserRole } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One fixed-size box for the trigger, its loading skeleton and its fallback: the account menu streams in
 * after the shell, and a size change would push the theme toggle sideways (layout shift).
 * Phones: a square avatar button. From `sm`, 176px with avatar, name (truncated) and chevron.
 */
const TRIGGER_BOX =
  "flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-control pointer-coarse:h-11 pointer-coarse:w-11 " +
  "sm:w-44 sm:justify-start sm:pl-1 sm:pr-2 sm:pointer-coarse:w-44";

/** How each role reads in the account menu and the sidebar. */
export const ROLE_LABELS: Record<UserRole, string> = { admin: "Admin", demo: "Demo · view only" };

export const PROFILE_PATH = "/profile";

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
          <Avatar name={user.name} src={user.avatarUrl} size={28} />
          <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-medium text-ink sm:block">{user.name}</span>
          <ChevronDownIcon className="hidden shrink-0 text-ink-subtle sm:block" />
        </button>
      )}
    >
      <div className="border-b border-line p-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-ui text-ink-muted">{user.email}</p>
          </div>
        </div>
        <span className="mt-2 inline-flex h-5 items-center rounded-tag bg-accent-soft px-1.5 text-caption font-semibold tracking-wide text-accent-fg uppercase">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
        {user.role === "demo" && (
          <p className="mt-2 flex items-start gap-1.5 text-ui text-ink-muted">
            <EyeIcon size={14} className="mt-0.5 shrink-0" />
            You can view everything. Adding, editing and deleting is for the main admin.
          </p>
        )}
      </div>
      <div className="grid gap-0.5 p-1.5">
        <Link
          href={PROFILE_PATH}
          className="flex h-9 items-center gap-2 rounded-control px-3.5 text-sm font-medium text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring pointer-coarse:h-11"
        >
          <PencilIcon />
          {user.role === "demo" ? "View profile" : "Edit profile"}
        </Link>
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
