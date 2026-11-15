import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as dashboard from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRole('admin'));

dashboardRouter.get('/stats', dashboard.stats);
