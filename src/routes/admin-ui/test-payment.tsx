import { Hono } from 'hono';
import { Layout } from '../../views/layout';
import type { Merchant } from '../../types';

function safeDecodeURI(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

const testPayment = new Hono<{ Bindings: Env }>();

testPayment.get('/', async (c) => {
  const merchantsList = await c.env.DB.prepare(
    'SELECT id, name, api_key FROM merchants WHERE is_active = 1 ORDER BY name',
  ).all<{ id: string; name: string; api_key: string }>();

  const result = c.req.query('result');
  const error = c.req.query('error');

  return c.html(
    <Layout title="Test Payment" activePage="/panel/test-payment">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Test Payment</h2>

        {error && (
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {safeDecodeURI(error)}
          </div>
        )}

        <form method="post" action="/panel/test-payment" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Merchant *</label>
            <select name="merchant_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select merchant</option>
              {merchantsList.results.map((m) => (
                <option value={m.id}>{m.name} ({m.api_key.substring(0, 12)}...)</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (IDR) *</label>
            <input type="number" name="amount" required min="1000" max="50000000" value="5000" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Donatur</label>
            <input type="text" name="customer_name" value="Anonim" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Donatur</label>
            <input type="email" name="customer_email" value="donatur@saweria.co" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <input type="text" name="message" value="Semangat terus!" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Create Test Payment
          </button>
        </form>

        {result && <PaymentResult data={result} />}
      </div>
    </Layout>,
  );
});

const PaymentResult = ({ data }: { data: string }) => {
  let parsed: { transaction_id: string; qr_string: string; amount: number; status: string };
  try {
    parsed = JSON.parse(decodeURIComponent(data));
  } catch {
    return <div class="mt-6 p-4 bg-red-50 rounded-lg text-sm text-red-600">Failed to parse result</div>;
  }

  return (
    <div class="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Created</h3>

      <div class="space-y-3 mb-6">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Transaction ID</span>
          <code class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{parsed.transaction_id}</code>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Amount</span>
          <span class="font-medium">Rp {parsed.amount.toLocaleString('id-ID')}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Status</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {parsed.status}
          </span>
        </div>
      </div>

      {parsed.qr_string && (
        <div class="text-center">
          <p class="text-sm text-gray-500 mb-3">Scan QR code to pay:</p>
          <div class="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(parsed.qr_string)}`}
              alt="QRIS QR Code"
              width="250"
              height="250"
            />
          </div>
          <p class="text-xs text-gray-400 mt-2 font-mono break-all max-w-md mx-auto">{parsed.qr_string}</p>
        </div>
      )}

      {/* Auto-poll status */}
      <div id="status-poll" class="mt-4 text-center">
        <p class="text-sm text-gray-500">Checking payment status...</p>
      </div>

      <script>{`
        (function() {
          const txId = "${parsed.transaction_id}";
          const statusEl = document.getElementById('status-poll');
          let attempts = 0;
          const maxAttempts = 120; // 10 minutes at 5s intervals

          function checkStatus() {
            if (attempts >= maxAttempts) {
              statusEl.innerHTML = '<p class="text-sm text-gray-500">Status check timed out. Check transactions page.</p>';
              return;
            }
            attempts++;
            fetch('/panel/test-payment/' + txId + '/status')
              .then(r => r.json())
              .then(data => {
                if (data.status === 'paid') {
                  statusEl.innerHTML = '<div class="p-3 bg-green-50 border border-green-200 rounded-lg"><p class="text-sm font-medium text-green-700">✅ Payment received!</p></div>';
                } else if (data.status === 'expired' || data.status === 'failed') {
                  statusEl.innerHTML = '<div class="p-3 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-600">Payment ' + data.status + '</p></div>';
                } else {
                  statusEl.innerHTML = '<p class="text-sm text-gray-500">Status: ' + data.status + ' (checking... ' + attempts + '/' + maxAttempts + ')</p>';
                  setTimeout(checkStatus, 5000);
                }
              })
              .catch(() => {
                statusEl.innerHTML = '<p class="text-sm text-red-500">Error checking status</p>';
                setTimeout(checkStatus, 10000);
              });
          }
          setTimeout(checkStatus, 3000);
        })();
      `}</script>
    </div>
  );
};

// Create test payment
testPayment.post('/', async (c) => {
  const body = await c.req.parseBody();
  const merchantId = body['merchant_id'] as string;
  const amount = Number(body['amount']);
  const customerName = (body['customer_name'] as string) || 'Anonim';
  const customerEmail = (body['customer_email'] as string) || 'donatur@saweria.co';
  const message = (body['message'] as string) || '';

  const merchant = await c.env.DB.prepare('SELECT * FROM merchants WHERE id = ? AND is_active = 1')
    .bind(merchantId)
    .first<Merchant>();

  if (!merchant) {
    return c.redirect('/panel/test-payment?error=' + encodeURIComponent('Merchant not found or inactive'));
  }

  // Call our own API internally
  const { createQrisPayment } = await import('../../services/saweria');
  const { generateId } = await import('../../lib/utils');

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
    const saweriaRes = await createQrisPayment(
      c.env,
      merchant.saweria_token,
      merchant.saweria_user_id,
      amount,
      message,
      customerName,
      customerEmail,
      '',
      proxyOverride,
    );

    const txId = generateId();
    const paymentData = saweriaRes.data;

    await c.env.DB.prepare(
      `INSERT INTO transactions (id, merchant_id, saweria_payment_id, amount, currency, status, payment_type, qr_string, customer_name, customer_email, message, saweria_raw_response)
       VALUES (?, ?, ?, ?, 'IDR', 'pending', 'qris', ?, ?, ?, ?, ?)`,
    )
      .bind(txId, merchant.id, paymentData.id, amount, paymentData.qr_string, customerName, customerEmail, message, JSON.stringify(saweriaRes))
      .run();

    const result = encodeURIComponent(JSON.stringify({
      transaction_id: txId,
      qr_string: paymentData.qr_string,
      amount,
      status: 'pending',
    }));

    return c.redirect(`/panel/test-payment?result=${result}`);
  } catch (err) {
    let msg = err instanceof Error ? err.message : 'Unknown error';
    // Strip HTML and truncate to avoid URI issues
    msg = msg.replace(/<[^>]*>/g, '').substring(0, 200);
    return c.redirect('/panel/test-payment?error=' + encodeURIComponent(msg));
  }
});

// Status check endpoint for polling
testPayment.get('/:id/status', async (c) => {
  const txId = c.req.param('id');

  const tx = await c.env.DB.prepare('SELECT status, paid_at FROM transactions WHERE id = ?')
    .bind(txId)
    .first<{ status: string; paid_at: string | null }>();

  if (!tx) return c.json({ status: 'not_found' });

  // If pending, try live check
  if (tx.status === 'pending') {
    const fullTx = await c.env.DB.prepare(
      `SELECT t.saweria_payment_id, m.saweria_token
       FROM transactions t JOIN merchants m ON t.merchant_id = m.id
       WHERE t.id = ?`,
    )
      .bind(txId)
      .first<{ saweria_payment_id: string; saweria_token: string }>();

    if (fullTx?.saweria_payment_id) {
      try {
        const { checkPaymentStatus } = await import('../../services/saweria');

        // Look up merchant's bound proxy for status check
        let proxyOverride: { url: string; secret: string; upstreamProxy?: string } | undefined;
        const merchantRow = await c.env.DB.prepare(
          'SELECT m.proxy_id FROM transactions t JOIN merchants m ON t.merchant_id = m.id WHERE t.id = ?',
        ).bind(txId).first<{ proxy_id: string | null }>();
        if (merchantRow?.proxy_id) {
          const proxy = await c.env.DB.prepare(
            'SELECT url, secret, upstream_proxy FROM proxies WHERE id = ? AND is_active = 1',
          ).bind(merchantRow.proxy_id).first<{ url: string; secret: string; upstream_proxy: string }>();
          if (proxy) {
            proxyOverride = { url: proxy.url, secret: proxy.secret, upstreamProxy: proxy.upstream_proxy || undefined };
          }
        }

        const statusRes = await checkPaymentStatus(c.env, fullTx.saweria_token, fullTx.saweria_payment_id, proxyOverride);
        const saweriaStatus = statusRes.data.transaction_status?.toLowerCase();

        if (saweriaStatus === 'settlement' || saweriaStatus === 'capture' || saweriaStatus === 'success') {
          await c.env.DB.prepare(
            `UPDATE transactions SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
          ).bind(txId).run();
          return c.json({ status: 'paid' });
        }
      } catch {
        // ignore, return cached
      }
    }
  }

  return c.json({ status: tx.status, paid_at: tx.paid_at });
});

export default testPayment;
