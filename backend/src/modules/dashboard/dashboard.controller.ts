import { handler } from '../../lib/handler.js';
import { dashboardStatsQuerySchema } from './dashboard.schema.js';
import * as dashboardService from './dashboard.service.js';

export const stats = handler({ query: dashboardStatsQuerySchema }, async ({ query }, _req, res) => {
  res.json({ data: await dashboardService.getDashboardStats(query.range) });
});
