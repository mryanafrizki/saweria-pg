export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
}

export function generateApiKey(): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 10));
  }
  return `spg_${segments.join('')}`;
}

export function generateWebinterceptSecret(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, message }, status);
}

export function successResponse<T>(message: string, data?: T, status = 200): Response {
  return jsonResponse({ success: true, message, data }, status);
}

/** Create HMAC-SHA256 signature for webhook verification */
export async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
