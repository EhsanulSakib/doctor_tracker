import { handler } from '../../lib/handler.js';
import { currentUser } from '../../middleware/auth.js';
import { changePasswordSchema, loginSchema, updateProfileSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies.js';

export const login = handler({ body: loginSchema }, async ({ body }, _req, res) => {
  const session = await authService.login(body.email, body.password);
  setAuthCookies(res, session);
  res.json({ data: { user: session.user } });
});

export const demoLogin = handler({}, async (_input, _req, res) => {
  const session = await authService.demoLogin();
  setAuthCookies(res, session);
  res.json({ data: { user: session.user } });
});

export const refresh = handler({}, async (_input, req, res) => {
  try {
    const session = await authService.refresh(req.cookies[REFRESH_COOKIE]);
    setAuthCookies(res, session);
    res.json({ data: { user: session.user } });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
});

export const logout = handler({}, async (_input, req, res) => {
  await authService.logout(req.cookies[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(204).end();
});

export const me = handler({}, async (_input, req, res) => {
  const user = await authService.getCurrentUser(currentUser(req).userId);
  res.json({ data: { user } });
});

export const updateProfile = handler({ body: updateProfileSchema }, async ({ body }, req, res) => {
  const user = await authService.updateProfile(currentUser(req).userId, body);
  res.json({ data: { user } });
});

export const changePassword = handler({ body: changePasswordSchema }, async ({ body }, req, res) => {
  const session = await authService.changePassword(currentUser(req).userId, body.currentPassword, body.newPassword);
  setAuthCookies(res, session);
  res.json({ data: { user: session.user } });
});
