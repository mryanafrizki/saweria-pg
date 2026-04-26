CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  saweria_token TEXT NOT NULL,
  saweria_user_id TEXT NOT NULL,
  webintercept_url TEXT,
  webintercept_secret TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_merchants_api_key ON merchants(api_key);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  saweria_payment_id TEXT,
  reference_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL DEFAULT 'qris',
  qr_string TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  message TEXT,
  saweria_raw_response TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_saweria_id ON transactions(saweria_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id);

CREATE TABLE IF NOT EXISTS webintercept_logs (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  request_body TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE INDEX IF NOT EXISTS idx_webintercept_logs_transaction ON webintercept_logs(transaction_id);
