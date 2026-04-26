import { Hono } from 'hono';
import { Layout } from '../../views/layout';
import type { Merchant, Proxy } from '../../types';
import { generateId, generateApiKey, generateWebinterceptSecret } from '../../lib/utils';

function safeDecodeURI(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

const merchants = new Hono<{ Bindings: Env }>();

// List merchants
merchants.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM merchants ORDER BY created_at DESC',
  ).all<Merchant>();

  const success = c.req.query('success');
  const error = c.req.query('error');

  return c.html(
    <Layout title="Merchants" activePage="/panel/merchants">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Merchants</h2>
        <a
          href="/panel/merchants/new"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Merchant
        </a>
      </div>

      {success && (
        <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {safeDecodeURI(success)}
        </div>
      )}
      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {safeDecodeURI(error)}
        </div>
      )}

      <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">API Key</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Saweria User</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Webintercept URL</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {rows.results.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">No merchants yet</td>
              </tr>
            ) : (
              rows.results.map((m) => (
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-600">{m.api_key}</td>
                  <td class="px-4 py-3 text-gray-600 text-xs">{m.saweria_user_id}</td>
                  <td class="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{m.webintercept_url ?? '-'}</td>
                  <td class="px-4 py-3">
                    <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex gap-2">
                      <a href={`/panel/merchants/${m.id}`} class="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</a>
                      <form method="post" action={`/panel/merchants/${m.id}/rotate-key`} class="inline">
                        <button type="submit" class="text-orange-600 hover:text-orange-800 text-xs font-medium" onclick="return confirm('Rotate API key? Old key will stop working.')">
                          Rotate Key
                        </button>
                      </form>
                      <form method="post" action={`/panel/merchants/${m.id}/toggle`} class="inline">
                        <button type="submit" class={`text-xs font-medium ${m.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                          {m.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>,
  );
});

// New merchant form
merchants.get('/new', async (c) => {
  const proxyList = await c.env.DB.prepare(
    'SELECT id, name, url FROM proxies WHERE is_active = 1 ORDER BY name',
  ).all<{ id: string; name: string; url: string }>();

  return c.html(
    <Layout title="Add Merchant" activePage="/panel/merchants">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Add Merchant</h2>
        <form method="post" action="/panel/merchants" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Toko ABC" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Saweria User ID *</label>
            <input type="text" name="saweria_user_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="UUID dari akun Saweria (lihat JWT payload atau /users endpoint)" />
            <p class="text-xs text-gray-400 mt-1">Semua pembayaran akan masuk ke akun Saweria ini</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Saweria Bearer Token (opsional)</label>
            <textarea name="saweria_token" rows={2} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Opsional — hanya untuk fitur cek saldo & riwayat transaksi" />
            <p class="text-xs text-gray-400 mt-1">Tidak diperlukan untuk create payment & cek status</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Webintercept URL</label>
            <input type="url" name="webintercept_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://yourapp.com/webintercept/payment" />
            <p class="text-xs text-gray-400 mt-1">We'll POST payment status updates to this URL</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Proxy</label>
            <select name="proxy_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Default (global)</option>
              {proxyList.results.map((p) => (
                <option value={p.id}>{p.name} — {p.url}</option>
              ))}
            </select>
            <p class="text-xs text-gray-400 mt-1">Select a proxy for this merchant or use the global default</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Create Merchant
            </button>
            <a href="/panel/merchants" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </Layout>,
  );
});

// Create merchant
merchants.post('/', async (c) => {
  const body = await c.req.parseBody();
  const name = body['name'] as string;
  const saweriaToken = (body['saweria_token'] as string) || '';
  const saweriaUserId = body['saweria_user_id'] as string;
  const webinterceptUrl = (body['webintercept_url'] as string) || null;
  const proxyId = (body['proxy_id'] as string) || null;

  if (!name || !saweriaUserId) {
    return c.redirect('/panel/merchants?error=' + encodeURIComponent('Name dan Saweria User ID wajib diisi'));
  }

  const id = generateId();
  const apiKey = generateApiKey();
  const webinterceptSecret = generateWebinterceptSecret();

  await c.env.DB.prepare(
    `INSERT INTO merchants (id, name, api_key, saweria_token, saweria_user_id, webintercept_url, webintercept_secret, proxy_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, name, apiKey, saweriaToken, saweriaUserId, webinterceptUrl, webinterceptSecret, proxyId)
    .run();

  return c.redirect('/panel/merchants?success=' + encodeURIComponent('Merchant "' + name + '" created. API Key: ' + apiKey));
});

// Edit merchant form
merchants.get('/:id', async (c) => {
  const id = c.req.param('id');
  const merchant = await c.env.DB.prepare('SELECT * FROM merchants WHERE id = ?')
    .bind(id)
    .first<Merchant>();

  if (!merchant) return c.redirect('/panel/merchants?error=Merchant+not+found');

  const proxyList = await c.env.DB.prepare(
    'SELECT id, name, url FROM proxies WHERE is_active = 1 ORDER BY name',
  ).all<{ id: string; name: string; url: string }>();

  return c.html(
    <Layout title={'Edit ' + merchant.name} activePage="/panel/merchants">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit: {merchant.name}</h2>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-blue-700">API Key</span>
            <code class="text-xs font-mono bg-blue-100 px-2 py-1 rounded">{merchant.api_key}</code>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-blue-700">Webintercept Secret</span>
            <code class="text-xs font-mono bg-blue-100 px-2 py-1 rounded">{merchant.webintercept_secret}</code>
          </div>
        </div>

        <form method="post" action={'/panel/merchants/' + id + '/update'} class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" name="name" value={merchant.name} required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Saweria User ID *</label>
            <input type="text" name="saweria_user_id" value={merchant.saweria_user_id} required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p class="text-xs text-gray-400 mt-1">Semua pembayaran masuk ke akun Saweria ini</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Saweria Bearer Token (opsional)</label>
            <textarea name="saweria_token" rows={2} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500">{merchant.saweria_token}</textarea>
            <p class="text-xs text-gray-400 mt-1">Hanya untuk fitur cek saldo & riwayat transaksi</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Webintercept URL</label>
            <input type="url" name="webintercept_url" value={merchant.webintercept_url ?? ''} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Proxy</label>
            <select name="proxy_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Default (global)</option>
              {proxyList.results.map((p) => (
                <option value={p.id} selected={merchant.proxy_id === p.id}>{p.name} — {p.url}</option>
              ))}
            </select>
            <p class="text-xs text-gray-400 mt-1">Select a proxy for this merchant or use the global default</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
            <a href="/panel/merchants" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Back
            </a>
          </div>
        </form>
      </div>
    </Layout>,
  );
});

// Update merchant
merchants.post('/:id/update', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const proxyId = (body['proxy_id'] as string) || null;

  await c.env.DB.prepare(
    `UPDATE merchants SET name = ?, saweria_token = ?, saweria_user_id = ?, webintercept_url = ?, proxy_id = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(
      body['name'] as string,
      body['saweria_token'] as string,
      body['saweria_user_id'] as string,
      (body['webintercept_url'] as string) || null,
      proxyId,
      id,
    )
    .run();

  return c.redirect('/panel/merchants?success=' + encodeURIComponent('Merchant updated'));
});

// Rotate API key
merchants.post('/:id/rotate-key', async (c) => {
  const id = c.req.param('id');
  const newKey = generateApiKey();

  await c.env.DB.prepare(`UPDATE merchants SET api_key = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(newKey, id)
    .run();

  return c.redirect('/panel/merchants?success=' + encodeURIComponent(`API key rotated. New key: ${newKey}`));
});

// Toggle active
merchants.post('/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const merchant = await c.env.DB.prepare('SELECT is_active FROM merchants WHERE id = ?')
    .bind(id)
    .first<{ is_active: number }>();

  if (!merchant) return c.redirect('/panel/merchants?error=Merchant+not+found');

  await c.env.DB.prepare(`UPDATE merchants SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(merchant.is_active ? 0 : 1, id)
    .run();

  return c.redirect('/panel/merchants?success=' + encodeURIComponent(`Merchant ${merchant.is_active ? 'disabled' : 'enabled'}`));
});

export default merchants;
