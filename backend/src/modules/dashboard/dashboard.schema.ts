import { z } from 'zod';
import { optionalQuery } from '../../lib/schemas.js';

export const DASHBOARD_RANGES = ['30d', '90d', '12m'] as const;

export const dashboardStatsQuerySchema = z.object({
  range: optionalQuery(z.enum(DASHBOARD_RANGES, 'Use 30d, 90d or 12m')).transform((range) => range ?? '30d'),
});

export type DashboardRange = (typeof DASHBOARD_RANGES)[number];
