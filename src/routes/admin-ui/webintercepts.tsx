import { Hono } from 'hono';
import { Layout } from '../../views/layout';

const webintercepts = new Hono<{ Bindings: Env }>();

webintercepts.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const [countResult, rows] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as total FROM webintercept_logs').first<{ total: number }>(),
    c.env.DB.prepare(
      `SELECT w.*, t.amount, t.status as tx_status, m.name as merchant_name
       FROM webintercept_logs w
       JOIN transactions t ON w.transaction_id = t.id
       JOIN merchants m ON w.merchant_id = m.id
       ORDER BY w.created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(limit, offset)
      .all<{
        id: string; transaction_id: string; merchant_name: string; url: string;
        response_status: number; success: number; attempt: number;
        amount: number; tx_status: string; created_at: string;
      }>(),
  ]);

  const total = countResult?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Webintercept Logs" activePage="/panel/webintercepts">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Webintercept Delivery Logs</h2>

      <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Transaction</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">URL</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">HTTP Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Result</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Attempt</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {rows.results.length === 0 ? (
              <tr>
                <td colspan={8} class="px-4 py-8 text-center text-gray-400">No webintercept deliveries yet</td>
              </tr>
            ) : (
              rows.results.map((log) => (
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-700">{log.merchant_name}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-600">{log.transaction_id.substring(0, 12)}...</td>
                  <td class="px-4 py-3 text-right font-medium">Rp {log.amount.toLocaleString('id-ID')}</td>
                  <td class="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.url}</td>
                  <td class="px-4 py-3 font-mono text-xs">{log.response_status || '-'}</td>
                  <td class="px-4 py-3">
                    <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">#{log.attempt}</td>
                  <td class="px-4 py-3 text-xs text-gray-500">{log.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div class="flex gap-2">
            {page > 1 && (
              <a href={`/panel/webintercepts?page=${page - 1}`} class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Previous</a>
            )}
            {page < totalPages && (
              <a href={`/panel/webintercepts?page=${page + 1}`} class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next</a>
            )}
          </div>
        </div>
      )}
    </Layout>,
  );
});

export default webintercepts;
