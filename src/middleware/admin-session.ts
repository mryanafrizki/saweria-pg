import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';

type SessionEnv = {
  Bindings: Env;
};

/** Simple cookie-based admin session check */
export const adminSessionMiddleware = createMiddleware<SessionEnv>(async (c, next) => {
  const session = getCookie(c, 'admin_session');

  if (!session || session !== c.env.ADMIN_API_KEY) {
    return c.redirect('/panel/login');
  }

  await next();
});
