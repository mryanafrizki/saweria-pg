import { Hono } from 'hono';
import { Layout } from '../../views/layout';
import { StatCard } from '../../views/components/stat-card';

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.get('/', async (c) => {
  const [merchants, txTotal, txPaid, txPending, revenue] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM merchants').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM transactions').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'paid'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'paid'").first<{ total: number }>(),
  ]);

  const recentTx = await c.env.DB.prepare(
    `SELECT t.id, t.amount, t.status, t.customer_name, t.created_at, m.name as merchant_name
     FROM transactions t
     JOIN merchants m ON t.merchant_id = m.id
     ORDER BY t.created_at DESC LIMIT 10`,
  ).all<{ id: string; amount: number; status: string; customer_name: string; created_at: string; merchant_name: string }>();

  return c.html(
    <Layout title="Dashboard" activePage="/panel">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Merchants" value={merchants?.count ?? 0} icon="🏪" />
        <StatCard label="Total Transactions" value={txTotal?.count ?? 0} icon="💳" />
        <StatCard label="Paid" value={txPaid?.count ?? 0} icon="✅" subtext={`${txPending?.count ?? 0} pending`} />
        <StatCard
          label="Revenue"
          value={`Rp ${(revenue?.total ?? 0).toLocaleString('id-ID')}`}
          icon="💰"
        />
      </div>

      <h3 class="text-lg font-semibold text-gray-900 mb-3">Recent Transactions</h3>
      <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="px-4 py-3 text-left font-medium text-gray-500">ID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Donatur</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {recentTx.results.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">No transactions yet</td>
              </tr>
            ) : (
              recentTx.results.map((tx) => (
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-mono text-xs text-gray-600">{tx.id.substring(0, 12)}...</td>
                  <td class="px-4 py-3 text-gray-700">{tx.merchant_name}</td>
                  <td class="px-4 py-3 text-gray-700">{tx.customer_name ?? '-'}</td>
                  <td class="px-4 py-3 text-right font-medium">Rp {tx.amount.toLocaleString('id-ID')}</td>
                  <td class="px-4 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{tx.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
  const colorClass = colors[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

export default dashboard;
