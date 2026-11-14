import { Router } from 'express';
import { isDbConnected } from './config/db.js';
import { apiLimiter } from './middleware/rate-limit.js';

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

// Feature routers are mounted here as modules are added:
// apiRouter.use('/auth', authRouter);
