import { Router } from 'express';
import { isDbConnected } from './config/db.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { doctorsRouter } from './modules/doctors/doctors.routes.js';
import { patientsRouter } from './modules/patients/patients.routes.js';

export const apiRouter = Router();

// Health check stays outside the rate limiter so uptime probes never get throttled.
apiRouter.get('/health', (_req, res) => {
  const dbUp = isDbConnected();
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
  });
});

apiRouter.use(apiLimiter);

apiRouter.use('/auth', authRouter);
apiRouter.use('/doctors', doctorsRouter);
apiRouter.use('/patients', patientsRouter);
apiRouter.use('/dashboard', dashboardRouter);
