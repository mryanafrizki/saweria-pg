import type {
  SaweriaCreatePaymentResponse,
  SaweriaCheckStatusResponse,
  SaweriaBalanceResponse,
} from '../types';

/**
 * All requests go through our saweria-proxy (Dokploy) which uses
 * wreq-js (browser TLS fingerprint) to bypass Cloudflare WAF.
 *
 * Create payment & check status: NO bearer token needed (anonymous/public endpoints)
 * Balance & transactions: NEED bearer token (authenticated endpoints)
 */

async function proxyFetch(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  path: string,
  saweriaToken?: string,
  options?: { method?: string; body?: string },
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<Response> {
  const proxyUrl = proxyOverride?.url ?? env.PROXY_URL;
  const proxySecret = proxyOverride?.secret ?? env.PROXY_SECRET;
  const url = `${proxyUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Proxy-Secret': proxySecret,
  };

  // Only send token for authenticated endpoints (balance, transactions)
  if (saweriaToken) {
    headers['X-Saweria-Token'] = saweriaToken;
  }

  // Chain through upstream proxy if configured
  if (proxyOverride?.upstreamProxy) {
    headers['X-Upstream-Proxy'] = proxyOverride.upstreamProxy;
  }

  return fetch(url, {
    method: options?.method ?? 'GET',
    headers,
    body: options?.body,
  });
}

// In-memory cache for username → UUID resolution (avoids repeated lookups)
const userIdCache = new Map<string, { uuid: string; expiresAt: number }>();

/** Resolve Saweria username to UUID. If already a UUID, return as-is. */
export async function resolveUserId(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  userIdOrUsername: string,
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<string> {
  // Already a UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername)) {
    return userIdOrUsername;
  }

  // Check cache (1 hour TTL)
  const cached = userIdCache.get(userIdOrUsername);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.uuid;
  }

  // Fetch from Saweria: GET /users/{username} → { data: { id: "uuid" } }
  const res = await proxyFetch(env, `/users/${userIdOrUsername}`, undefined, undefined, proxyOverride);
  if (!res.ok) {
    throw new Error(`Failed to resolve Saweria username "${userIdOrUsername}" (${res.status})`);
  }

  const json = (await res.json()) as { data?: { id?: string } };
  const uuid = json.data?.id;
  if (!uuid) {
    throw new Error(`Saweria user "${userIdOrUsername}" not found`);
  }

  // Cache for 1 hour
  userIdCache.set(userIdOrUsername, { uuid, expiresAt: Date.now() + 3600_000 });
  return uuid;
}

/** Create QRIS payment — PUBLIC endpoint, no token needed */
export async function createQrisPayment(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  _token: string, // kept for backward compat but not sent
  userId: string,
  amount: number,
  message: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<SaweriaCreatePaymentResponse> {
  // Auto-resolve username to UUID if needed
  const resolvedId = await resolveUserId(env, userId, proxyOverride);

  const res = await proxyFetch(env, `/donations/snap/${resolvedId}`, undefined, {
    method: 'POST',
    body: JSON.stringify({
      agree: true,
      notUnderage: true,
      payment_type: 'qris',
      vote: '',
      currency: 'IDR',
      amount: String(amount),
      message,
      customer_info: {
        first_name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
    }),
  }, proxyOverride);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Saweria create payment failed (${res.status}): ${text.replace(/<[^>]*>/g, '').substring(0, 200)}`);
  }

  return res.json() as Promise<SaweriaCreatePaymentResponse>;
}

/** Check payment status — PUBLIC endpoint, no token needed */
export async function checkPaymentStatus(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  _token: string, // kept for backward compat but not sent
  paymentId: string,
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<SaweriaCheckStatusResponse> {
  const res = await proxyFetch(env, `/donations/qris/snap/${paymentId}`, undefined, undefined, proxyOverride);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Saweria check status failed (${res.status}): ${text.replace(/<[^>]*>/g, '').substring(0, 200)}`);
  }

  return res.json() as Promise<SaweriaCheckStatusResponse>;
}

/** Get balance — AUTHENTICATED endpoint, needs token */
export async function getAvailableBalance(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  token: string,
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<SaweriaBalanceResponse> {
  const res = await proxyFetch(env, '/donations/available-balance', token, undefined, proxyOverride);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Saweria get balance failed (${res.status}): ${text.replace(/<[^>]*>/g, '').substring(0, 200)}`);
  }

  return res.json() as Promise<SaweriaBalanceResponse>;
}

/** Get transactions — AUTHENTICATED endpoint, needs token */
export async function getTransactions(
  env: { PROXY_URL: string; PROXY_SECRET: string },
  token: string,
  page = 1,
  pageSize = 15,
  proxyOverride?: { url: string; secret: string; upstreamProxy?: string },
): Promise<unknown> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const res = await proxyFetch(env, `/transactions?${params}`, token, undefined, proxyOverride);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Saweria get transactions failed (${res.status}): ${text.replace(/<[^>]*>/g, '').substring(0, 200)}`);
  }

  const json = (await res.json()) as { data: unknown };
  return json.data;
}
