import { Router } from 'express';
import { staffAccess } from '../../middleware/auth.js';
import * as dashboard from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(staffAccess);

dashboardRouter.get('/stats', dashboard.stats);
