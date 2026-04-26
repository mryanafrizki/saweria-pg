import { Hono } from 'hono';
import type { Merchant, CreateMerchantBody, UpdateMerchantBody } from '../types';
import { generateId, generateApiKey, generateWebinterceptSecret } from '../lib/utils';

const admin = new Hono<{ Bindings: Env }>();

// POST /admin/merchants — Create merchant
admin.post('/merchants', async (c) => {
  const body = await c.req.json<CreateMerchantBody>();

  if (!body.name || !body.saweria_user_id) {
    return c.json(
      { success: false, message: 'name and saweria_user_id are required' },
      400,
    );
  }

  const id = generateId();
  const apiKey = generateApiKey();
  const webinterceptSecret = generateWebinterceptSecret();

  await c.env.DB.prepare(
    `INSERT INTO merchants (id, name, api_key, saweria_token, saweria_user_id, webintercept_url, webintercept_secret)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.name,
      apiKey,
      body.saweria_token ?? '',
      body.saweria_user_id,
      body.webintercept_url ?? null,
      webinterceptSecret,
    )
    .run();

  return c.json(
    {
      success: true,
      message: 'Merchant created',
      data: {
        id,
        name: body.name,
        api_key: apiKey,
        webintercept_secret: webinterceptSecret,
        webintercept_url: body.webintercept_url ?? null,
      },
    },
    201,
  );
});

// GET /admin/merchants — List merchants
admin.get('/merchants', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, name, api_key, saweria_user_id, webintercept_url, is_active, created_at FROM merchants ORDER BY created_at DESC',
  ).all<Omit<Merchant, 'saweria_token' | 'webintercept_secret' | 'updated_at'>>();

  return c.json({
    success: true,
    message: 'Merchants retrieved',
    data: rows.results,
  });
});

// GET /admin/merchants/:id — Get merchant detail
admin.get('/merchants/:id', async (c) => {
  const id = c.req.param('id');
  const merchant = await c.env.DB.prepare('SELECT * FROM merchants WHERE id = ?')
    .bind(id)
    .first<Merchant>();

  if (!merchant) {
    return c.json({ success: false, message: 'Merchant not found' }, 404);
  }

  return c.json({
    success: true,
    message: 'Merchant found',
    data: {
      id: merchant.id,
      name: merchant.name,
      api_key: merchant.api_key,
      saweria_user_id: merchant.saweria_user_id,
      webintercept_url: merchant.webintercept_url,
      webintercept_secret: merchant.webintercept_secret,
      is_active: merchant.is_active,
      created_at: merchant.created_at,
    },
  });
});

// PATCH /admin/merchants/:id — Update merchant
admin.patch('/merchants/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateMerchantBody>();

  const existing = await c.env.DB.prepare('SELECT id FROM merchants WHERE id = ?')
    .bind(id)
    .first<{ id: string }>();

  if (!existing) {
    return c.json({ success: false, message: 'Merchant not found' }, 404);
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.saweria_token !== undefined) {
    updates.push('saweria_token = ?');
    values.push(body.saweria_token);
  }
  if (body.saweria_user_id !== undefined) {
    updates.push('saweria_user_id = ?');
    values.push(body.saweria_user_id);
  }
  if (body.webintercept_url !== undefined) {
    updates.push('webintercept_url = ?');
    values.push(body.webintercept_url);
  }
  if (body.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ success: false, message: 'No fields to update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(`UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return c.json({ success: true, message: 'Merchant updated' });
});

// POST /admin/merchants/:id/rotate-key — Rotate API key
admin.post('/merchants/:id/rotate-key', async (c) => {
  const id = c.req.param('id');
  const newKey = generateApiKey();

  const result = await c.env.DB.prepare(
    `UPDATE merchants SET api_key = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(newKey, id)
    .run();

  if (!result.meta.changes) {
    return c.json({ success: false, message: 'Merchant not found' }, 404);
  }

  return c.json({
    success: true,
    message: 'API key rotated',
    data: { api_key: newKey },
  });
});

export default admin;
