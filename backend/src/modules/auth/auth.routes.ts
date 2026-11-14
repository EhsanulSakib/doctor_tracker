import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter, refreshLimiter } from '../../middleware/rate-limit.js';
import * as auth from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, auth.login);
authRouter.post('/refresh', refreshLimiter, auth.refresh);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
