import { Router } from 'express';
import { denyDemoWrites, requireAuth } from '../../middleware/auth.js';
import { loginLimiter, refreshLimiter } from '../../middleware/rate-limit.js';
import * as auth from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, auth.login);
authRouter.post('/demo', loginLimiter, auth.demoLogin);
authRouter.post('/refresh', refreshLimiter, auth.refresh);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
authRouter.patch('/me', requireAuth, denyDemoWrites, auth.updateProfile);
// Same limiter as login: a stolen session must not be able to brute-force the current password.
authRouter.post('/me/password', requireAuth, denyDemoWrites, loginLimiter, auth.changePassword);
