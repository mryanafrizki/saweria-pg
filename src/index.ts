import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authMiddleware, adminMiddleware } from './middleware/auth';
import { adminSessionMiddleware } from './middleware/admin-session';
import paymentRoutes from './routes/payment';
import balanceRoutes from './routes/balance';
import transactionRoutes from './routes/transactions';
import adminRoutes from './routes/admin';
import loginRoutes from './routes/admin-ui/login';
import dashboardRoutes from './routes/admin-ui/dashboard';
import merchantsUiRoutes from './routes/admin-ui/merchants';
import transactionsUiRoutes from './routes/admin-ui/transactions';
import webinterceptsUiRoutes from './routes/admin-ui/webintercepts';
import proxiesUiRoutes from './routes/admin-ui/proxies';
import testPaymentRoutes from './routes/admin-ui/test-payment';
import { handleCron } from './services/cron';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/', (c) =>
  c.json({
    name: 'saweria-pg',
    version: '1.0.0',
    status: 'ok',
  }),
);

// ─── Merchant API routes (requires X-API-Key) ──────────────
app.use('/api/v1/*', authMiddleware);
app.route('/api/v1/payment', paymentRoutes);
app.route('/api/v1/balance', balanceRoutes);
app.route('/api/v1/transactions', transactionRoutes);

// ─── Admin API routes (requires X-Admin-Key header) ────────
app.use('/admin/*', adminMiddleware);
app.route('/admin', adminRoutes);

// ─── Admin Panel UI (cookie session auth) ──────────────────
app.route('/panel', loginRoutes); // login/logout (no session required)
app.use('/panel/*', adminSessionMiddleware); // protect all other panel routes
app.route('/panel', dashboardRoutes);
app.route('/panel/merchants', merchantsUiRoutes);
app.route('/panel/transactions', transactionsUiRoutes);
app.route('/panel/webintercepts', webinterceptsUiRoutes);
app.route('/panel/proxies', proxiesUiRoutes);
app.route('/panel/test-payment', testPaymentRoutes);

// 404 handler
app.notFound((c) => c.json({ success: false, message: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json(
    { success: false, message: err.message || 'Internal server error' },
    500,
  );
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Cron trigger handler — polls pending payments
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleCron(env);
  },
};
