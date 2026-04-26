import { Hono } from 'hono';
import type { Merchant, Transaction, CreatePaymentBody, Proxy } from '../types';
import { generateId } from '../lib/utils';
import * as saweria from '../services/saweria';
import { deliverWebintercept } from '../services/webintercept';

type PaymentEnv = {
  Bindings: Env;
  Variables: {
    merchant: Merchant;
  };
};

const payment = new Hono<PaymentEnv>();

// POST /api/v1/payment — Create QRIS payment
payment.post('/', async (c) => {
  const merchant = c.get('merchant');
  const body = await c.req.json<CreatePaymentBody>();

  if (!body.amount || body.amount < 1000) {
    return c.json({ success: false, message: 'Minimum amount is 1000 IDR' }, 400);
  }

  if (body.amount > 50_000_000) {
    return c.json({ success: false, message: 'Maximum amount is 50,000,000 IDR' }, 400);
  }

  const txId = generateId();

  // Look up merchant's bound proxy (if any)
  let proxyOverride: { url: string; secret: string; upstreamProxy?: string } | undefined;
  if (merchant.proxy_id) {
    const proxy = await c.env.DB.prepare(
      'SELECT url, secret, upstream_proxy FROM proxies WHERE id = ? AND is_active = 1',
    ).bind(merchant.proxy_id).first<{ url: string; secret: string; upstream_proxy: string }>();
    if (proxy) {
      proxyOverride = { url: proxy.url, secret: proxy.secret, upstreamProxy: proxy.upstream_proxy || undefined };
    }
  }

  try {
    const saweriaRes = await saweria.createQrisPayment(
      c.env,
      merchant.saweria_token,
      merchant.saweria_user_id,
      body.amount,
      body.message ?? '',
      body.customer_name || 'Anonim',
      body.customer_email || 'donatur@saweria.co',
      body.customer_phone ?? '',
      proxyOverride,
    );

    const paymentData = saweriaRes.data;

    // Persist transaction
    await c.env.DB.prepare(
      `INSERT INTO transactions (id, merchant_id, saweria_payment_id, reference_id, amount, currency, status, payment_type, qr_string, customer_name, customer_email, customer_phone, message, saweria_raw_response)
       VALUES (?, ?, ?, ?, ?, 'IDR', 'pending', 'qris', ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        txId,
        merchant.id,
        paymentData.id,
        body.reference_id ?? null,
        body.amount,
        paymentData.qr_string,
        body.customer_name ?? null,
        body.customer_email ?? null,
        body.customer_phone ?? null,
        body.message ?? null,
        JSON.stringify(saweriaRes),
      )
      .run();

    return c.json({
      success: true,
      message: 'Payment created',
      data: {
        transaction_id: txId,
        saweria_payment_id: paymentData.id,
        amount: body.amount,
        qr_string: paymentData.qr_string,
        status: 'pending',
        payment_type: 'qris',
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment';
    return c.json({ success: false, message }, 502);
  }
});

// GET /api/v1/payment/:id — Check payment status
payment.get('/:id', async (c) => {
  const merchant = c.get('merchant');
  const txId = c.req.param('id');

  const tx = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND merchant_id = ?',
  )
    .bind(txId, merchant.id)
    .first<Transaction>();

  if (!tx) {
    return c.json({ success: false, message: 'Transaction not found' }, 404);
  }

  // If still pending, check Saweria for live status
  if (tx.status === 'pending' && tx.saweria_payment_id) {
    // Look up merchant's bound proxy
    let proxyOverride: { url: string; secret: string; upstreamProxy?: string } | undefined;
    if (merchant.proxy_id) {
      const proxy = await c.env.DB.prepare(
        'SELECT url, secret, upstream_proxy FROM proxies WHERE id = ? AND is_active = 1',
      ).bind(merchant.proxy_id).first<{ url: string; secret: string; upstream_proxy: string }>();
      if (proxy) {
        proxyOverride = { url: proxy.url, secret: proxy.secret, upstreamProxy: proxy.upstream_proxy || undefined };
      }
    }

    try {
      const statusRes = await saweria.checkPaymentStatus(
        c.env,
        merchant.saweria_token,
        tx.saweria_payment_id,
        proxyOverride,
      );

      const saweriaStatus = statusRes.data.transaction_status?.toLowerCase();

      if (saweriaStatus === 'settlement' || saweriaStatus === 'capture' || saweriaStatus === 'success') {
        await c.env.DB.prepare(
          `UPDATE transactions SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        )
          .bind(tx.id)
          .run();
        tx.status = 'paid';
        tx.paid_at = new Date().toISOString();

        // Trigger webhook on paid detection
        deliverWebintercept(c.env.DB, tx, merchant).catch(() => {});
      }
    } catch {
      // Saweria check failed — return cached status
    }
  }

  return c.json({
    success: true,
    message: 'Transaction found',
    data: {
      transaction_id: tx.id,
      reference_id: tx.reference_id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      payment_type: tx.payment_type,
      qr_string: tx.qr_string,
      customer_name: tx.customer_name,
      customer_email: tx.customer_email,
      paid_at: tx.paid_at,
      created_at: tx.created_at,
    },
  });
});

export default payment;
