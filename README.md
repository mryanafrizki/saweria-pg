# Saweria Payment Gateway

Cloudflare Worker + D1 database — payment gateway via Saweria QRIS.

## Components

```
Client → saweria-pg (CF Worker + D1) → saweria-proxy (VPS/Dokploy) → Saweria Backend
```

- **saweria-pg**: Cloudflare Worker — API gateway, admin panel, transaction database
- **saweria-proxy**: Docker container on VPS — TLS fingerprint bypass (wreq-js)

## Setup

### 1. Deploy saweria-proxy (Dokploy)

Di Dokploy dashboard:
- Create Application → Git → `https://github.com/mryanafrizki/saweria-pg.git`
- Branch: `main`, Build Path: `/saweria-proxy`
- Build Type: Dockerfile
- Environment: `PROXY_SECRET=your_secret` + `PORT=3001`
- Domains: Generate → port 3001
- Deploy

### 2. Deploy saweria-pg (Cloudflare Worker)

```bash
cd saweria-pg
npm install
npx wrangler login
npx wrangler d1 create your-db-name
# Edit wrangler.jsonc → paste database_id
npx wrangler d1 execute your-db-name --remote --file=./migrate.sql
npx wrangler d1 execute your-db-name --remote --file=./proxy-migration.sql
npx wrangler secret put ADMIN_API_KEY
# Edit wrangler.jsonc → PROXY_URL + PROXY_SECRET
npx wrangler deploy
```

### 3. Create Merchant

Buka panel: `https://your-worker.workers.dev/panel`
- Login dengan ADMIN_API_KEY
- Merchants → Create
- **Saweria User ID**: bisa username (`tankamashmilo`) atau UUID — auto-resolve

## Features

- QRIS payment via Saweria (anonymous, no token needed)
- Auto-resolve Saweria username → UUID
- Cron polling pending payments (every minute)
- Webhook delivery with HMAC-SHA256 signature
- Admin panel (merchant CRUD, transactions, test payment)
- Multi-merchant support
- Proxy chaining (HTTP/HTTPS/SOCKS5)

## API Docs

See [API_DOCS.md](./API_DOCS.md)
