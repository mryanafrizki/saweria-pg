import { Hono } from 'hono';
import { Layout } from '../../views/layout';
import type { Merchant } from '../../types';

const txRoutes = new Hono<{ Bindings: Env }>();

txRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = 20;
  const offset = (page - 1) * limit;
  const statusFilter = c.req.query('status') ?? '';
  const merchantFilter = c.req.query('merchant') ?? '';

  let where = 'WHERE 1=1';
  const params: string[] = [];

  if (statusFilter) {
    where += ' AND t.status = ?';
    params.push(statusFilter);
  }
  if (merchantFilter) {
    where += ' AND t.merchant_id = ?';
    params.push(merchantFilter);
  }

  const countStmt = c.env.DB.prepare(`SELECT COUNT(*) as total FROM transactions t ${where}`);
  const dataStmt = c.env.DB.prepare(
    `SELECT t.*, m.name as merchant_name
     FROM transactions t
     JOIN merchants m ON t.merchant_id = m.id
     ${where}
     ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
  );

  const countParams = [...params];
  const dataParams = [...params, String(limit), String(offset)];

  const [countResult, rows, merchantsList] = await Promise.all([
    countStmt.bind(...countParams).first<{ total: number }>(),
    dataStmt.bind(...dataParams).all<{
      id: string; merchant_name: string; amount: number; status: string;
      customer_name: string; customer_email: string; payment_type: string;
      reference_id: string; paid_at: string; created_at: string;
    }>(),
    c.env.DB.prepare('SELECT id, name FROM merchants ORDER BY name').all<{ id: string; name: string }>(),
  ]);

  const total = countResult?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (statusFilter) params.set('status', statusFilter);
    if (merchantFilter) params.set('merchant', merchantFilter);
    return `/panel/transactions?${params}`;
  };

  return c.html(
    <Layout title="Transactions" activePage="/panel/transactions">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Transactions</h2>

      {/* Filters */}
      <form method="get" action="/panel/transactions" class="flex gap-3 mb-4">
        <select name="status" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Status</option>
          {['pending', 'paid', 'expired', 'failed'].map((s) => (
            <option value={s} selected={statusFilter === s}>{s}</option>
          ))}
        </select>
        <select name="merchant" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Merchants</option>
          {merchantsList.results.map((m) => (
            <option value={m.id} selected={merchantFilter === m.id}>{m.name}</option>
          ))}
        </select>
        <button type="submit" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          Filter
        </button>
        {(statusFilter || merchantFilter) && (
          <a href="/panel/transactions" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</a>
        )}
      </form>

      <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="px-4 py-3 text-left font-medium text-gray-500">ID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Donatur</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Ref ID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Paid At</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {rows.results.length === 0 ? (
              <tr>
                <td colspan={8} class="px-4 py-8 text-center text-gray-400">No transactions found</td>
              </tr>
            ) : (
              rows.results.map((tx) => (
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-mono text-xs text-gray-600">{tx.id.substring(0, 12)}...</td>
                  <td class="px-4 py-3 text-gray-700">{tx.merchant_name}</td>
                  <td class="px-4 py-3 text-gray-700">{tx.customer_name ?? '-'}</td>
                  <td class="px-4 py-3 text-right font-medium">Rp {tx.amount.toLocaleString('id-ID')}</td>
                  <td class="px-4 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500">{tx.reference_id ?? '-'}</td>
                  <td class="px-4 py-3 text-xs text-gray-500">{tx.paid_at ?? '-'}</td>
                  <td class="px-4 py-3 text-xs text-gray-500">{tx.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</p>
          <div class="flex gap-2">
            {page > 1 && (
              <a href={buildUrl(page - 1)} class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Previous</a>
            )}
            {page < totalPages && (
              <a href={buildUrl(page + 1)} class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next</a>
            )}
          </div>
        </div>
      )}
    </Layout>,
  );
});

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

export default txRoutes;
