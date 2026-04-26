import { Hono } from 'hono';
import type { Merchant } from '../types';
import * as saweria from '../services/saweria';

type BalanceEnv = {
  Bindings: Env;
  Variables: {
    merchant: Merchant;
  };
};

const balance = new Hono<BalanceEnv>();

// GET /api/v1/balance
balance.get('/', async (c) => {
  const merchant = c.get('merchant');

  try {
    const res = await saweria.getAvailableBalance(c.env, merchant.saweria_token);

    return c.json({
      success: true,
      message: 'Balance retrieved',
      data: {
        available_balance: res.data.available_balance,
        currency: res.data.currency,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get balance';
    return c.json({ success: false, message }, 502);
  }
});

export default balance;
