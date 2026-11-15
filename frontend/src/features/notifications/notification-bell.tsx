"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  InboxIcon,
  StethoscopeIcon,
  SwapIcon,
  UserPlusIcon,
  type IconProps,
} from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useToast } from "@/hooks/use-toast";
import { clientFetch } from "@/lib/api/client-fetch";
import { cn } from "@/lib/utils";
import { timeAgo } from "./relative-time";
import {
  notificationHref,
  NOTIFICATIONS_REFRESH_EVENT,
  type AppNotification,
  type NotificationsResponse,
  type NotificationType,
} from "./types";

const POLL_MS = 60_000;
const PAGE_SIZE = 20;
/** createdAt of the newest notification the user has seen in the panel (stops the ping until something newer comes). */
const SEEN_KEY = "dt-notifications-seen";

type Feed = { status: "loading" | "ready" | "error"; items: AppNotification[]; unread: number };

const TYPE_STYLE: Record<NotificationType, { icon: ComponentType<IconProps>; tone: string }> = {
  patient_admitted: { icon: UserPlusIcon, tone: "bg-accent-soft text-accent-fg" },
  patient_recovered: { icon: CheckCircleIcon, tone: "bg-success-soft text-success" },
  patient_reassigned: { icon: SwapIcon, tone: "bg-info-soft text-info" },
  doctor_added: { icon: StethoscopeIcon, tone: "bg-accent-soft text-accent-fg" },
  doctor_unavailable: { icon: AlertTriangleIcon, tone: "bg-warning-soft text-warning" },
};

function readSeen(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Topbar bell. Loads the latest notifications after hydration, then every minute while the tab is
 * visible, when the tab comes back into view, and on `refreshNotifications()`. The count badge is a
 * fixed 18px circle ("9+" above nine) placed absolutely, so it never resizes the button or the bar.
 */
export function NotificationBell() {
  const [feed, setFeed] = useState<Feed>({ status: "loading", items: [], unread: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [seen, setSeen] = useState(readSeen);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      clientFetch<NotificationsResponse>("/notifications", { searchParams: { limit: PAGE_SIZE }, signal: controller.signal })
        .then((res) => setFeed({ status: "ready", items: res.data, unread: res.meta.unreadCount }))
        .catch(() => {
          // Keep showing what we have; only an empty bell turns into the error state.
          if (!controller.signal.aborted) setFeed((current) => (current.status === "ready" ? current : { ...current, status: "error" }));
        });
    };
    const loadIfVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    const timer = setInterval(loadIfVisible, POLL_MS);
    document.addEventListener("visibilitychange", loadIfVisible);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", loadIfVisible);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, load);
    };
  }, [reloadKey]);

  const newestUnread = feed.items.find((item) => !item.read);
  // Something arrived since the panel was last opened: ping until the user looks.
  const hasNew = !!newestUnread && newestUnread.createdAt > (seen ?? "");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setReloadKey((key) => key + 1);
    const newest = feed.items[0]?.createdAt;
    if (newest) {
      setSeen(newest);
      try {
        localStorage.setItem(SEEN_KEY, newest);
      } catch {
        // Not remembered across reloads; fine.
      }
    }
  };

  const markRead = (item: AppNotification) => {
    if (item.read) return;
    setFeed((current) => ({
      ...current,
      items: current.items.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      unread: Math.max(0, current.unread - 1),
    }));
    clientFetch(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => setReloadKey((key) => key + 1));
  };

  const markAllRead = async () => {
    const before = feed;
    setFeed((current) => ({ ...current, items: current.items.map((n) => ({ ...n, read: true })), unread: 0 }));
    try {
      await clientFetch("/notifications/read-all", { method: "POST" });
    } catch {
      setFeed(before);
      toast.error("Couldn't mark notifications as read", "Please try again.");
    }
  };

  const unreadLabel = feed.unread > 9 ? "9+" : String(feed.unread);

  return (
    <Popover
      label="Notifications"
      align="end"
      open={open}
      onOpenChange={handleOpenChange}
      initialFocus="panel"
      className="flex max-h-(--panel-max-height) w-[380px] flex-col p-0"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={feed.unread ? `Notifications, ${feed.unread} unread` : "Notifications"}
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring pointer-coarse:size-11"
        >
          {/* Re-keyed per new arrival, so the swing plays once for each. */}
          <span key={hasNew ? newestUnread.id : "idle"} className={cn("inline-flex origin-top", hasNew && "motion-safe:animate-bell-ring")}>
            <BellIcon size={19} />
          </span>
          {feed.unread > 0 && (
            <span aria-hidden className="absolute top-0.5 right-0.5 flex size-[18px] pointer-coarse:top-1.5 pointer-coarse:right-1.5">
              {hasNew && <span className="absolute inset-0 rounded-full bg-danger opacity-60 motion-safe:animate-ping-slow" />}
              <span className="relative flex size-[18px] items-center justify-center rounded-full bg-danger text-[10px] leading-none font-bold tabular-nums text-danger-ink ring-2 ring-surface">
                {unreadLabel}
              </span>
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-line py-2 pr-2 pl-4">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {feed.unread > 0 && <span className="text-xs text-ink-muted">{feed.unread} unread</span>}
            <button
              type="button"
              onClick={markAllRead}
              disabled={feed.unread === 0}
              className="ml-auto h-8 rounded-control px-2 text-xs font-medium text-accent-fg transition-colors hover:bg-paper-2 focus-ring disabled:pointer-events-none disabled:opacity-50 pointer-coarse:h-10"
            >
              Mark all as read
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <NotificationList
              feed={feed}
              onRetry={() => setReloadKey((key) => key + 1)}
              onOpenItem={(item) => {
                markRead(item);
                close();
              }}
            />
          </div>
        </>
      )}
    </Popover>
  );
}

function NotificationList({ feed, onRetry, onOpenItem }: { feed: Feed; onRetry: () => void; onOpenItem: (item: AppNotification) => void }) {
  const now = useNow("minute");

  if (feed.items.length === 0) {
    if (feed.status === "loading") {
      return (
        <ul aria-busy className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex gap-3 px-4 py-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 py-0.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </li>
          ))}
        </ul>
      );
    }
    if (feed.status === "error") {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-[13px] text-ink-muted">Couldn&apos;t load notifications</p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-paper-2 text-ink-muted">
          <InboxIcon size={18} />
        </span>
        <p className="text-[13px] font-medium text-ink">No notifications</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {feed.items.map((item) => {
        const { icon: Icon, tone } = TYPE_STYLE[item.type] ?? TYPE_STYLE.doctor_added;
        return (
          <li key={item.id}>
            <Link
              href={notificationHref(item)}
              onClick={() => onOpenItem(item)}
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-paper-2",
                "outline-none focus-visible:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-fg",
                !item.read && "bg-accent-soft/50",
              )}
            >
              <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13px] leading-[18px] text-ink", item.read ? "font-medium" : "font-semibold")}>{item.title}</span>
                <span className="mt-0.5 block text-xs leading-4 text-ink-muted">{item.message}</span>
                <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{now ? timeAgo(item.createdAt, now) : " "}</span>
              </span>
              {!item.read && (
                <>
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <span className="sr-only">Unread</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
