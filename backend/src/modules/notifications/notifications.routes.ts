import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as notifications from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth, requireRole('admin'));

notificationsRouter.get('/', notifications.list);
// Fixed path before "/:id" so it is not treated as an id.
notificationsRouter.post('/read-all', notifications.markAllRead);
notificationsRouter.patch('/:id/read', notifications.markRead);
