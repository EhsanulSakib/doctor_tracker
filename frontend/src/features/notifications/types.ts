/** Mirrors the backend notifications contract (module 2.4). */
export const NOTIFICATION_TYPES = [
  "patient_admitted",
  "patient_recovered",
  "patient_reassigned",
  "doctor_added",
  "doctor_unavailable",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  subject: { kind: "doctor" | "patient"; id: string; name: string };
  read: boolean;
  /** ISO timestamp. */
  createdAt: string;
};

export type NotificationsResponse = { data: AppNotification[]; meta: { unreadCount: number } };

/** Where a notification leads: the doctor's profile, or the patient found in the patients list. */
export const notificationHref = ({ subject }: AppNotification) =>
  subject.kind === "doctor" ? `/doctors/${subject.id}` : `/patients?search=${encodeURIComponent(subject.name)}`;

/** Fire after a create / update / delete so the bell refreshes right away instead of at the next poll. */
export const NOTIFICATIONS_REFRESH_EVENT = "dt:notifications-refresh";
export const refreshNotifications = () => window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
