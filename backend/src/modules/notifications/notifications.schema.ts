import { z } from 'zod';

export const NOTIFICATIONS_DEFAULT_LIMIT = 20;
export const NOTIFICATIONS_MAX_LIMIT = 50;

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(NOTIFICATIONS_MAX_LIMIT).default(NOTIFICATIONS_DEFAULT_LIMIT),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
