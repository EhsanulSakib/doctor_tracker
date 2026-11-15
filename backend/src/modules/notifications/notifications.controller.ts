import { handler } from '../../lib/handler.js';
import { idParamsSchema } from '../../lib/schemas.js';
import { listNotificationsQuerySchema } from './notifications.schema.js';
import * as notificationsService from './notifications.service.js';

export const list = handler({ query: listNotificationsQuerySchema }, async ({ query }, _req, res) => {
  res.json(await notificationsService.listNotifications(query.limit));
});

export const markRead = handler({ params: idParamsSchema }, async ({ params }, _req, res) => {
  res.json({ data: await notificationsService.markNotificationRead(params.id) });
});

export const markAllRead = handler({}, async (_input, _req, res) => {
  res.json({ data: await notificationsService.markAllNotificationsRead() });
});
