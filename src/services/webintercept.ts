import type { Transaction, Merchant, WebinterceptPayload } from '../types';
import { generateId, createSignature } from '../lib/utils';

export async function deliverWebintercept(
  db: D1Database,
  transaction: Transaction,
  merchant: Merchant,
): Promise<boolean> {
  if (!merchant.webintercept_url) return false;

  const payload: WebinterceptPayload = {
    event: mapStatusToEvent(transaction.status),
    transaction_id: transaction.id,
    reference_id: transaction.reference_id,
    merchant_id: transaction.merchant_id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    payment_type: transaction.payment_type,
    customer_name: transaction.customer_name,
    customer_email: transaction.customer_email,
    paid_at: transaction.paid_at,
    created_at: transaction.created_at,
  };

  const body = JSON.stringify(payload);
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Id': generateId(),
    'X-Webhook-Timestamp': new Date().toISOString(),
  };

  if (merchant.webintercept_secret) {
    const signature = await createSignature(body, merchant.webintercept_secret);
    requestHeaders['X-Webhook-Signature'] = signature;
  }

  let responseStatus = 0;
  let responseBody = '';
  let success = false;

  try {
    const res = await fetch(merchant.webintercept_url, {
      method: 'POST',
      headers: requestHeaders,
      body,
    });
    responseStatus = res.status;
    responseBody = await res.text();
    success = res.ok;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : 'Unknown error';
  }

  // Log the delivery attempt
  await db
    .prepare(
      `INSERT INTO webintercept_logs (id, transaction_id, merchant_id, url, request_body, response_status, response_body, attempt, success)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .bind(
      generateId(),
      transaction.id,
      merchant.id,
      merchant.webintercept_url,
      body,
      responseStatus,
      responseBody.substring(0, 2000),
      success ? 1 : 0,
    )
    .run();

  return success;
}

function mapStatusToEvent(status: string): WebinterceptPayload['event'] {
  switch (status) {
    case 'paid':
      return 'payment.success';
    case 'expired':
      return 'payment.expired';
    case 'failed':
      return 'payment.failed';
    default:
      return 'payment.success';
  }
}
