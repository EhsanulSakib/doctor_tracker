import { z } from 'zod';
import { ATTENDANCE_STATUSES } from '../../constants/enums.js';
import { handler } from '../../lib/handler.js';
import { dateOnlySchema, idParamsSchema } from '../../lib/schemas.js';
import * as attendanceService from './attendance.service.js';

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(7, 'Use 7 to 182 days').max(182, 'Use 7 to 182 days').default(30),
});

const markBodySchema = z.object({
  /** Defaults to today in APP_TIMEZONE. */
  date: dateOnlySchema.optional(),
  /** `null` clears the day (back to "not marked"). */
  status: z.enum(ATTENDANCE_STATUSES, 'Choose present, absent or leave').nullable(),
});

/** GET /api/doctors/:id/attendance?days=30 */
export const history = handler({ params: idParamsSchema, query: historyQuerySchema }, async ({ params, query }, _req, res) => {
  res.json({ data: await attendanceService.listAttendance(params.id, query.days) });
});

/** PUT /api/doctors/:id/attendance  { date?, status } */
export const mark = handler({ params: idParamsSchema, body: markBodySchema }, async ({ params, body }, _req, res) => {
  res.json({ data: await attendanceService.setAttendance(params.id, body.date, body.status) });
});
