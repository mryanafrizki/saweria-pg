import type { Transaction, Merchant, Proxy } from '../types';
import * as saweria from './saweria';
import { deliverWebintercept } from './webintercept';

/**
 * Cron handler: poll all pending transactions and update status.
 * Sends webintercept to merchant when payment is settled.
 */
export async function handleCron(env: Env): Promise<void> {
  const db = env.DB;
  // Get all pending transactions (max 50 per cron run to stay within CPU limits)
  const pending = await db
    .prepare(
      `SELECT t.*, m.saweria_token, m.name as merchant_name, m.proxy_id
       FROM transactions t
       JOIN merchants m ON t.merchant_id = m.id
       WHERE t.status = 'pending'
         AND m.is_active = 1
         AND t.created_at > datetime('now', '-24 hours')
       ORDER BY t.created_at ASC
       LIMIT 50`,
    )
    .all<Transaction & { saweria_token: string; merchant_name: string; proxy_id: string | null }>();

  if (!pending.results.length) return;

  // Group by merchant to batch Saweria API calls
  for (const tx of pending.results) {
    if (!tx.saweria_payment_id) continue;

    try {
      // Look up merchant's bound proxy
      let proxyOverride: { url: string; secret: string; upstreamProxy?: string } | undefined;
      if (tx.proxy_id) {
        const proxy = await db.prepare(
          'SELECT url, secret, upstream_proxy FROM proxies WHERE id = ? AND is_active = 1',
        ).bind(tx.proxy_id).first<{ url: string; secret: string; upstream_proxy: string }>();
        if (proxy) {
          proxyOverride = { url: proxy.url, secret: proxy.secret, upstreamProxy: proxy.upstream_proxy || undefined };
        }
      }

      const statusRes = await saweria.checkPaymentStatus(
        env,
        tx.saweria_token,
        tx.saweria_payment_id,
        proxyOverride,
      );

      const saweriaStatus = statusRes.data.transaction_status?.toLowerCase();

      if (saweriaStatus === 'settlement' || saweriaStatus === 'capture' || saweriaStatus === 'success') {
        // Update to paid
        await db
          .prepare(
            `UPDATE transactions SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
          )
          .bind(tx.id)
          .run();

        // Fetch full merchant for webintercept delivery
        const merchant = await db
          .prepare('SELECT * FROM merchants WHERE id = ?')
          .bind(tx.merchant_id)
          .first<Merchant>();

        if (merchant) {
          const updatedTx = { ...tx, status: 'paid', paid_at: new Date().toISOString() };
          await deliverWebintercept(db, updatedTx, merchant);
        }
      } else if (saweriaStatus === 'expire' || saweriaStatus === 'expired') {
        await db
          .prepare(
            `UPDATE transactions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`,
          )
          .bind(tx.id)
          .run();
      } else if (saweriaStatus === 'deny' || saweriaStatus === 'cancel') {
        await db
          .prepare(
            `UPDATE transactions SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
          )
          .bind(tx.id)
          .run();
      }
      // else: still pending, do nothing
    } catch {
      // Individual transaction check failed — skip, will retry next cron
      console.error(`Failed to check status for tx ${tx.id}`);
    }
  }
}
