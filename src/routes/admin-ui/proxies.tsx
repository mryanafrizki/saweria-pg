import { Hono } from 'hono';
import { Layout } from '../../views/layout';
import type { Proxy } from '../../types';
import { generateId } from '../../lib/utils';

function safeDecodeURI(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

const proxies = new Hono<{ Bindings: Env }>();

// List proxies
proxies.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM proxies ORDER BY created_at DESC',
  ).all<Proxy>();

  const success = c.req.query('success');
  const error = c.req.query('error');

  return c.html(
    <Layout title="Proxies" activePage="/panel/proxies">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Proxies</h2>
        <a href="/panel/proxies/new" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">+ Add Proxy</a>
      </div>

      {success && (
        <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{safeDecodeURI(success)}</div>
      )}
      {error && (
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{safeDecodeURI(error)}</div>
      )}

      <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">URL</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Secret</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Created</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {rows.results.length === 0 ? (
              <tr><td colspan={6} class="px-4 py-8 text-center text-gray-400">No proxies yet</td></tr>
            ) : (
              rows.results.map((p) => {
                const statusCls = p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                const toggleCls = p.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800';
                return (
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-600 max-w-[250px] truncate">{p.url}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-600">{p.secret.substring(0, 8)}...</td>
                    <td class="px-4 py-3">
                      <span class={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + statusCls}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500">{p.created_at}</td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <a href={'/panel/proxies/' + p.id} class="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</a>
                        <form method="post" action={'/panel/proxies/' + p.id + '/toggle'} class="inline">
                          <button type="submit" class={'text-xs font-medium ' + toggleCls}>{p.is_active ? 'Disable' : 'Enable'}</button>
                        </form>
                        <form method="post" action={'/panel/proxies/' + p.id + '/delete'} class="inline">
                          <button type="submit" class="text-red-600 hover:text-red-800 text-xs font-medium" onclick="return confirm('Delete this proxy? Merchants using it will fall back to global proxy.')">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>,
  );
});

// New proxy form
proxies.get('/new', (c) => {
  return c.html(
    <Layout title="Add Proxy" activePage="/panel/proxies">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Add Proxy</h2>
        <form method="post" action="/panel/proxies" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Proxy SG-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <input type="url" name="url" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://saweria-proxy.168.144.75.119.sslip.io" />
            <p class="text-xs text-gray-400 mt-1">Full URL of the proxy server</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Secret *</label>
            <input type="text" name="secret" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="proxy-secret-key" />
            <p class="text-xs text-gray-400 mt-1">X-Proxy-Secret header value for authenticating with this proxy</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Upstream Proxy (opsional)</label>
            <input type="text" name="upstream_proxy" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://user:pass@host:port atau socks5://user:pass@host:port" />
            <p class="text-xs text-gray-400 mt-1">Support HTTP, HTTPS, SOCKS5. Kosongkan untuk direct connection dari VPS.</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Create Proxy</button>
            <a href="/panel/proxies" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</a>
          </div>
        </form>
      </div>
    </Layout>,
  );
});

// Create proxy
proxies.post('/', async (c) => {
  const body = await c.req.parseBody();
  const name = body['name'] as string;
  const url = body['url'] as string;
  const secret = body['secret'] as string;
  const upstreamProxy = (body['upstream_proxy'] as string) || '';

  if (!name || !url || !secret) {
    return c.redirect('/panel/proxies?error=' + encodeURIComponent('Name, URL, and Secret are required'));
  }

  const id = generateId();

  await c.env.DB.prepare(
    'INSERT INTO proxies (id, name, url, secret, upstream_proxy) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, name, url, secret, upstreamProxy)
    .run();

  return c.redirect('/panel/proxies?success=' + encodeURIComponent('Proxy "' + name + '" created'));
});

// Edit proxy form
proxies.get('/:id', async (c) => {
  const id = c.req.param('id');
  const proxy = await c.env.DB.prepare('SELECT * FROM proxies WHERE id = ?')
    .bind(id)
    .first<Proxy>();

  if (!proxy) return c.redirect('/panel/proxies?error=Proxy+not+found');

  const usage = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM merchants WHERE proxy_id = ?',
  ).bind(id).first<{ count: number }>();

  return c.html(
    <Layout title={'Edit ' + proxy.name} activePage="/panel/proxies">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit: {proxy.name}</h2>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-blue-700">ID</span>
            <code class="text-xs font-mono bg-blue-100 px-2 py-1 rounded">{proxy.id}</code>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-blue-700">Merchants using this proxy</span>
            <span class="text-sm font-medium text-blue-900">{usage?.count ?? 0}</span>
          </div>
        </div>

        <form method="post" action={'/panel/proxies/' + id + '/update'} class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" name="name" value={proxy.name} required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <input type="url" name="url" value={proxy.url} required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Secret *</label>
            <input type="text" name="secret" value={proxy.secret} required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Upstream Proxy (opsional)</label>
            <input type="text" name="upstream_proxy" value={proxy.upstream_proxy || ''} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://user:pass@host:port atau socks5://user:pass@host:port" />
            <p class="text-xs text-gray-400 mt-1">Support HTTP, HTTPS, SOCKS5. Kosongkan untuk direct connection dari VPS.</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Save Changes</button>
            <a href="/panel/proxies" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Back</a>
          </div>
        </form>
      </div>
    </Layout>,
  );
});

// Update proxy
proxies.post('/:id/update', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const upstreamProxy = (body['upstream_proxy'] as string) || '';

  await c.env.DB.prepare(
    'UPDATE proxies SET name = ?, url = ?, secret = ?, upstream_proxy = ? WHERE id = ?',
  )
    .bind(body['name'] as string, body['url'] as string, body['secret'] as string, upstreamProxy, id)
    .run();

  return c.redirect('/panel/proxies?success=' + encodeURIComponent('Proxy updated'));
});

// Toggle active
proxies.post('/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const proxy = await c.env.DB.prepare('SELECT is_active FROM proxies WHERE id = ?')
    .bind(id)
    .first<{ is_active: number }>();

  if (!proxy) return c.redirect('/panel/proxies?error=Proxy+not+found');

  await c.env.DB.prepare('UPDATE proxies SET is_active = ? WHERE id = ?')
    .bind(proxy.is_active ? 0 : 1, id)
    .run();

  return c.redirect('/panel/proxies?success=' + encodeURIComponent('Proxy ' + (proxy.is_active ? 'disabled' : 'enabled')));
});

// Delete proxy
proxies.post('/:id/delete', async (c) => {
  const id = c.req.param('id');

  // Unlink merchants using this proxy
  await c.env.DB.prepare('UPDATE merchants SET proxy_id = NULL WHERE proxy_id = ?')
    .bind(id)
    .run();

  await c.env.DB.prepare('DELETE FROM proxies WHERE id = ?')
    .bind(id)
    .run();

  return c.redirect('/panel/proxies?success=' + encodeURIComponent('Proxy deleted. Affected merchants reset to global proxy.'));
});

export default proxies;
