import { Hono } from 'hono';
import type { Merchant, Transaction } from '../types';

type TxEnv = {
  Bindings: Env;
  Variables: {
    merchant: Merchant;
  };
};

const transactions = new Hono<TxEnv>();

// GET /api/v1/transactions
transactions.get('/', async (c) => {
  const merchant = c.get('merchant');
  const page = Number(c.req.query('page') ?? '1');
  const limit = Math.min(Number(c.req.query('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM transactions WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    )
      .bind(merchant.id, limit, offset)
      .all<Transaction>(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM transactions WHERE merchant_id = ?')
      .bind(merchant.id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.json({
    success: true,
    message: 'Transactions retrieved',
    data: {
      transactions: rows.results.map((tx) => ({
        transaction_id: tx.id,
        reference_id: tx.reference_id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        payment_type: tx.payment_type,
        customer_name: tx.customer_name,
        customer_email: tx.customer_email,
        paid_at: tx.paid_at,
        created_at: tx.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
  });
});

export default transactions;
