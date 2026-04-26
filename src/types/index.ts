// ─── Proxy ──────────────────────────────────────────────────
export interface Proxy {
  id: string;
  name: string;
  url: string;
  secret: string;
  upstream_proxy: string;
  is_active: number;
  created_at: string;
}

// ─── Merchant ───────────────────────────────────────────────
export interface Merchant {
  id: string;
  name: string;
  api_key: string;
  saweria_token: string;
  saweria_user_id: string;
  webintercept_url: string | null;
  webintercept_secret: string | null;
  proxy_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMerchantBody {
  name: string;
  saweria_token: string;
  saweria_user_id: string;
  webintercept_url?: string;
}

export interface UpdateMerchantBody {
  name?: string;
  saweria_token?: string;
  saweria_user_id?: string;
  webintercept_url?: string;
  is_active?: boolean;
}

// ─── Transaction ────────────────────────────────────────────
export interface Transaction {
  id: string;
  merchant_id: string;
  saweria_payment_id: string | null;
  reference_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  qr_string: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  message: string | null;
  saweria_raw_response: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionStatus = 'pending' | 'paid' | 'expired' | 'failed';

export interface CreatePaymentBody {
  amount: number;
  message?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  reference_id?: string;
}

// ─── Saweria API ────────────────────────────────────────────
export interface SaweriaCreatePaymentRequest {
  agree: boolean;
  notUnderage: boolean;
  payment_type: string;
  vote: string;
  currency: string;
  amount: number;
  message: string;
  customer_info: {
    first_name: string;
    email: string;
    phone: string;
  };
}

export interface SaweriaCreatePaymentResponse {
  data: {
    id: string;
    amount: number;
    qr_string: string;
    status: string;
    etc: {
      amount_to_display: number;
    };
  };
}

export interface SaweriaCheckStatusResponse {
  data: {
    id: string;
    amount_raw: number;
    transaction_status: string;
    created_at: string;
  };
}

export interface SaweriaBalanceResponse {
  data: {
    available_balance: number;
    currency: string;
  };
}

// ─── Webintercept ───────────────────────────────────────────
export interface WebinterceptPayload {
  event: 'payment.success' | 'payment.expired' | 'payment.failed';
  transaction_id: string;
  reference_id: string | null;
  merchant_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  customer_name: string | null;
  customer_email: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── API Response ───────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
