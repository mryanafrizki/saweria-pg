import { createMiddleware } from 'hono/factory';
import type { Merchant } from '../types';

type AuthEnv = {
  Bindings: Env;
  Variables: {
    merchant: Merchant;
  };
};

/** Validate merchant API key from X-API-Key header */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ success: false, message: 'Missing X-API-Key header' }, 401);
  }

  const merchant = await c.env.DB.prepare(
    'SELECT * FROM merchants WHERE api_key = ? AND is_active = 1',
  )
    .bind(apiKey)
    .first<Merchant>();

  if (!merchant) {
    return c.json({ success: false, message: 'Invalid or inactive API key' }, 401);
  }

  c.set('merchant', merchant);
  await next();
});

type AdminEnv = {
  Bindings: Env;
};

/** Validate admin API key from X-Admin-Key header */
export const adminMiddleware = createMiddleware<AdminEnv>(async (c, next) => {
  const adminKey = c.req.header('X-Admin-Key');

  if (!adminKey || adminKey !== c.env.ADMIN_API_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  await next();
});
