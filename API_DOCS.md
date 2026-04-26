# Saweria Payment Gateway — Dokumentasi Lengkap

## Admin Panel

```
URL      : https://saweria-pg.roubot71.workers.dev/panel
Password : saweria-pg-admin-2026
```

## Base URL (API)

```
https://saweria-pg.roubot71.workers.dev
```

## Autentikasi

Semua request butuh header `X-API-Key` yang didapat dari admin.

```
X-API-Key: spg_xxxxxxxxxxxx
```

Setiap API key terhubung ke satu akun Saweria. Semua pembayaran via API key tersebut masuk ke akun Saweria yang di-bind.

---

## Arsitektur

```
Project A ──► PG API (CF Worker) ──► Saweria Proxy (VPS) ──► Saweria Backend
                  │                        │
                  D1 Database         TLS Fingerprint
                  (transaksi)         (bypass Cloudflare)
```

- **CF Worker**: API gateway, admin panel, database
- **Saweria Proxy**: bypass Cloudflare WAF dengan browser TLS fingerprint
- **Setiap merchant bisa di-bind ke proxy berbeda** (untuk distribusi IP)

---

## Endpoints

### 1. Buat Pembayaran (Generate QR)

```
POST /api/v1/payment
```

#### Request

```json
{
  "amount": 25000,
  "message": "Semangat kak!",
  "customer_name": "Zikri",
  "customer_email": "zikri4827@gmail.com"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `amount` | number | Ya | Nominal IDR (min 1000) |
| `message` | string | Ya | Pesan donasi — **harus random/scramble** |
| `customer_name` | string | Ya | Nama donatur — **harus random/scramble** |
| `customer_email` | string | Ya | Email donatur — **harus random, domain bervariasi** |
| `reference_id` | string | Tidak | ID referensi internal kamu |

#### Response

```json
{
  "success": true,
  "data": {
    "transaction_id": "mo7hd8af_xbfu7flp",
    "saweria_payment_id": "42309cd2-...",
    "amount": 25000,
    "qr_string": "00020101021226650013CO.XENDIT...",
    "status": "pending",
    "payment_type": "qris",
    "created_at": "2026-04-20T17:40:19.000Z"
  }
}
```

Render `qr_string` jadi QR code di frontend. User scan dan bayar.

---

### 2. Cek Status Pembayaran

```
GET /api/v1/payment/{transaction_id}
```

#### Response

```json
{
  "success": true,
  "data": {
    "transaction_id": "mo7hd8af_xbfu7flp",
    "amount": 25000,
    "status": "paid",
    "paid_at": "2026-04-20T17:41:00.000Z"
  }
}
```

| Status | Keterangan |
|---|---|
| `pending` | Menunggu pembayaran |
| `paid` | Sudah dibayar |
| `expired` | QR expired (~15 menit) |
| `failed` | Gagal |

**Polling**: Hit endpoint ini tiap 3-5 detik dari frontend sampai status bukan `pending`.

---

### 3. Cek Saldo (butuh bearer token di merchant)

```
GET /api/v1/balance
```

### 4. Riwayat Transaksi

```
GET /api/v1/transactions?page=1&limit=20
```

### 5. Webhook (Opsional)

Kalau merchant set webhook URL, kami POST otomatis saat pembayaran berhasil:

```json
POST https://project-kamu.com/webhook

Headers:
  X-Webhook-Signature: <hmac-sha256>
  X-Webhook-Timestamp: 2026-04-20T17:41:00Z

Body:
{
  "event": "payment.success",
  "transaction_id": "mo7hd8af_xbfu7flp",
  "amount": 25000,
  "status": "paid",
  "paid_at": "2026-04-20T17:41:00Z"
}
```

---

## WAJIB: Sistem Scramble Data Donatur

Setiap request **HARUS** menggunakan nama, email, dan pesan yang **unik dan acak**. Jangan pernah kirim data yang sama dua kali. Gunakan sistem scramble berikut.

### Cara Kerja Scramble

#### 1. Nama — Acak Huruf dari Nama Dasar

Ambil nama dasar, lalu **acak urutan hurufnya** (anagram). Hasilnya tetap terlihat seperti nama.

```
Rizki  → Zikri, Kirzi, Irzik, Rikzi
Dewi   → Wedi, Eiwd, Dwei, Wied
Andi   → Dani, Nadi, Inda, Dina
Sari   → Risa, Iras, Aris, Sira
Budi   → Dibu, Ubid, Ibud, Dubi
```

#### 2. Email — Nama Scramble + Angka Random + Domain Random

```
zikri4827@gmail.com
wedi1953@yahoo.co.id
dani7041@outlook.com
risa3862@protonmail.com
dibu5519@icloud.com
```

#### 3. Pesan — Pilih Random + Variasi Kecil

Tambahkan emoji random, tanda seru, atau angka di akhir.

```
Semangat terus kak!
Sukses selalu ya 🔥
Mantap kontennya!!
Lanjutkan kak 💪
Keren bgt dah
Semoga makin sukses 🎉
Gas terus kak!
Suka bgt kontennya
Terus berkarya ya!
Ditunggu konten barunya
Keren kak 👍
Semangat ya kak
Lanjut terus!
Mantap bgt!
Sukses terus ya
Keep it up!
Bagus bgt kak
Top dah 🔥
Salut kak!
Inspiratif bgt
Keren parah sih
Semangat trs ya
Gaskeun kak!
Kontennya bagus bgt
Sering2 live ya kak
Ditunggu karya selanjutnya
Makin keren aja
Supportmu selalu kak
Jangan nyerah ya!
Proud of you kak
```

### Daftar Nama Dasar (100+)

```
Rizki, Dewi, Andi, Sari, Budi, Putri, Fajar, Nisa, Dimas, Ayu,
Raka, Lina, Yoga, Mega, Bayu, Rina, Arif, Wulan, Dani, Tika,
Hendra, Sinta, Galih, Indah, Eko, Ratna, Agus, Fitri, Joko, Yuni,
Wahyu, Dina, Rendi, Citra, Ilham, Novi, Surya, Lia, Adi, Rini,
Taufik, Anisa, Feri, Lestari, Bambang, Nurul, Irfan, Siti, Rahmat, Wati,
Gilang, Aisyah, Rangga, Melati, Fikri, Zahra, Doni, Kartika, Hadi, Laras,
Yusuf, Amira, Bagus, Tiara, Rian, Nabila, Aldi, Intan, Faisal, Aulia,
Reza, Dinda, Hafiz, Salma, Iqbal, Kirana, Adit, Nadia, Farhan, Cantika,
Ridho, Shinta, Alvin, Mira, Zaki, Bella, Dafa, Rani, Gibran, Tasya,
Naufal, Vina, Rafli, Winda, Aziz, Della, Kemal, Yanti, Lutfi, Anggi
```

### Daftar Domain Email (20+)

```
gmail.com, yahoo.com, outlook.com, hotmail.com, yahoo.co.id,
protonmail.com, icloud.com, mail.com, zoho.com, yandex.com,
aol.com, gmx.com, live.com, msn.com, inbox.com,
fastmail.com, tutanota.com, pm.me, outlook.co.id, rocketmail.com
```

---

## Contoh Implementasi (JavaScript/Node.js)

```javascript
// ─── Scramble System ────────────────────────────────────

const NAMES = [
  'Rizki', 'Dewi', 'Andi', 'Sari', 'Budi', 'Putri', 'Fajar', 'Nisa',
  'Dimas', 'Ayu', 'Raka', 'Lina', 'Yoga', 'Mega', 'Bayu', 'Rina',
  'Arif', 'Wulan', 'Dani', 'Tika', 'Hendra', 'Sinta', 'Galih', 'Indah',
  'Eko', 'Ratna', 'Agus', 'Fitri', 'Joko', 'Yuni', 'Wahyu', 'Dina',
  'Rendi', 'Citra', 'Ilham', 'Novi', 'Surya', 'Lia', 'Adi', 'Rini',
  'Taufik', 'Anisa', 'Feri', 'Lestari', 'Bambang', 'Nurul', 'Irfan',
  'Siti', 'Rahmat', 'Wati', 'Gilang', 'Aisyah', 'Rangga', 'Melati',
  'Fikri', 'Zahra', 'Doni', 'Kartika', 'Hadi', 'Laras', 'Yusuf',
  'Amira', 'Bagus', 'Tiara', 'Rian', 'Nabila', 'Aldi', 'Intan',
  'Faisal', 'Aulia', 'Reza', 'Dinda', 'Hafiz', 'Salma', 'Iqbal',
  'Kirana', 'Adit', 'Nadia', 'Farhan', 'Cantika', 'Ridho', 'Shinta',
  'Alvin', 'Mira', 'Zaki', 'Bella', 'Dafa', 'Rani', 'Gibran', 'Tasya',
  'Naufal', 'Vina', 'Rafli', 'Winda', 'Aziz', 'Della', 'Kemal', 'Yanti',
  'Lutfi', 'Anggi',
];

const DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'yahoo.co.id',
  'protonmail.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com',
  'aol.com', 'gmx.com', 'live.com', 'msn.com', 'inbox.com',
  'fastmail.com', 'tutanota.com', 'pm.me', 'outlook.co.id', 'rocketmail.com',
];

const MESSAGES = [
  'Semangat terus kak!', 'Sukses selalu ya', 'Mantap kontennya',
  'Lanjutkan kak', 'Keren bgt dah', 'Semoga makin sukses',
  'Gas terus kak!', 'Suka bgt kontennya', 'Terus berkarya ya!',
  'Ditunggu konten barunya', 'Keren kak', 'Semangat ya kak',
  'Lanjut terus!', 'Mantap bgt!', 'Sukses terus ya',
  'Keep it up!', 'Bagus bgt kak', 'Top dah', 'Salut kak!',
  'Inspiratif bgt', 'Keren parah sih', 'Semangat trs ya',
  'Gaskeun kak!', 'Kontennya bagus bgt', 'Sering2 live ya kak',
  'Ditunggu karya selanjutnya', 'Makin keren aja',
  'Supportmu selalu kak', 'Jangan nyerah ya!', 'Proud of you kak',
];

const EMOJIS = ['', '', ' 🔥', ' 💪', ' 🎉', ' 👍', ' ❤️', ' ✨', ' 💯', ' 🙌'];
const SUFFIXES = ['', '', '!', '!!', ' ya', ' kak', ' bgt', ' dong'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(min = 2, max = 5) {
  const len = min + Math.floor(Math.random() * (max - min + 1));
  let result = '';
  for (let i = 0; i < len; i++) result += Math.floor(Math.random() * 10);
  return result;
}

/** Scramble nama — acak urutan huruf */
function scrambleName(name) {
  const chars = name.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  // Capitalize first letter
  const result = chars.join('');
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

/** Generate data donatur yang unik setiap kali */
function generateDonatur() {
  const baseName = randomItem(NAMES);
  const name = Math.random() > 0.5 ? scrambleName(baseName) : baseName;

  const domain = randomItem(DOMAINS);
  const email = `${name.toLowerCase()}${randomDigits(3, 5)}@${domain}`;

  let message = randomItem(MESSAGES);
  message += randomItem(EMOJIS);
  message += randomItem(SUFFIXES);

  return { name, email, message: message.trim() };
}

// ─── API Client ─────────────────────────────────────────

const API_KEY = 'spg_xxxxxxxxxxxx'; // dari admin
const BASE_URL = 'https://saweria-pg.roubot71.workers.dev';

async function createPayment(amount) {
  const donatur = generateDonatur();

  const res = await fetch(`${BASE_URL}/api/v1/payment`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      message: donatur.message,
      customer_name: donatur.name,
      customer_email: donatur.email,
    }),
  });

  return res.json();
}

async function checkPayment(transactionId) {
  const res = await fetch(`${BASE_URL}/api/v1/payment/${transactionId}`, {
    headers: { 'X-API-Key': API_KEY },
  });
  return res.json();
}

async function waitForPayment(transactionId, intervalMs = 5000, timeoutMs = 900000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data } = await checkPayment(transactionId);

    if (data.status === 'paid') return data;
    if (data.status === 'expired' || data.status === 'failed') {
      throw new Error(`Payment ${data.status}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Payment timeout');
}

// ─── Contoh Penggunaan ──────────────────────────────────

const payment = await createPayment(25000);
console.log('QR String:', payment.data.qr_string);
console.log('Transaction ID:', payment.data.transaction_id);

// Render QR code di frontend, user scan dan bayar...

const result = await waitForPayment(payment.data.transaction_id);
console.log('Pembayaran berhasil!', result);
```

---

## Contoh Implementasi (Python)

```python
import random
import string
import time
import requests

# ─── Scramble System ────────────────────────────────────

NAMES = [
    'Rizki', 'Dewi', 'Andi', 'Sari', 'Budi', 'Putri', 'Fajar', 'Nisa',
    'Dimas', 'Ayu', 'Raka', 'Lina', 'Yoga', 'Mega', 'Bayu', 'Rina',
    'Arif', 'Wulan', 'Dani', 'Tika', 'Hendra', 'Sinta', 'Galih', 'Indah',
    'Eko', 'Ratna', 'Agus', 'Fitri', 'Joko', 'Yuni', 'Wahyu', 'Dina',
    'Rendi', 'Citra', 'Ilham', 'Novi', 'Surya', 'Lia', 'Adi', 'Rini',
    'Taufik', 'Anisa', 'Feri', 'Lestari', 'Bambang', 'Nurul', 'Irfan',
    'Siti', 'Rahmat', 'Wati', 'Gilang', 'Aisyah', 'Rangga', 'Melati',
    'Fikri', 'Zahra', 'Doni', 'Kartika', 'Hadi', 'Laras', 'Yusuf',
    'Amira', 'Bagus', 'Tiara', 'Rian', 'Nabila', 'Aldi', 'Intan',
    'Faisal', 'Aulia', 'Reza', 'Dinda', 'Hafiz', 'Salma', 'Iqbal',
    'Kirana', 'Adit', 'Nadia', 'Farhan', 'Cantika', 'Ridho', 'Shinta',
    'Alvin', 'Mira', 'Zaki', 'Bella', 'Dafa', 'Rani', 'Gibran', 'Tasya',
    'Naufal', 'Vina', 'Rafli', 'Winda', 'Aziz', 'Della', 'Kemal', 'Yanti',
    'Lutfi', 'Anggi',
]

DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'yahoo.co.id',
    'protonmail.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com',
    'aol.com', 'gmx.com', 'live.com', 'msn.com', 'inbox.com',
    'fastmail.com', 'tutanota.com', 'pm.me', 'outlook.co.id', 'rocketmail.com',
]

MESSAGES = [
    'Semangat terus kak!', 'Sukses selalu ya', 'Mantap kontennya',
    'Lanjutkan kak', 'Keren bgt dah', 'Semoga makin sukses',
    'Gas terus kak!', 'Suka bgt kontennya', 'Terus berkarya ya!',
    'Ditunggu konten barunya', 'Keren kak', 'Semangat ya kak',
    'Lanjut terus!', 'Mantap bgt!', 'Sukses terus ya',
    'Keep it up!', 'Bagus bgt kak', 'Top dah', 'Salut kak!',
    'Inspiratif bgt', 'Keren parah sih', 'Semangat trs ya',
    'Gaskeun kak!', 'Kontennya bagus bgt', 'Sering2 live ya kak',
    'Ditunggu karya selanjutnya', 'Makin keren aja',
    'Supportmu selalu kak', 'Jangan nyerah ya!', 'Proud of you kak',
]

EMOJIS = ['', '', ' 🔥', ' 💪', ' 🎉', ' 👍', ' ❤️', ' ✨', ' 💯', ' 🙌']
SUFFIXES = ['', '', '!', '!!', ' ya', ' kak', ' bgt', ' dong']


def scramble_name(name):
    """Acak urutan huruf dari nama"""
    chars = list(name)
    random.shuffle(chars)
    result = ''.join(chars)
    return result[0].upper() + result[1:].lower()


def generate_donatur():
    base_name = random.choice(NAMES)
    name = scramble_name(base_name) if random.random() > 0.5 else base_name

    domain = random.choice(DOMAINS)
    digits = ''.join(random.choices(string.digits, k=random.randint(3, 5)))
    email = f"{name.lower()}{digits}@{domain}"

    message = random.choice(MESSAGES) + random.choice(EMOJIS) + random.choice(SUFFIXES)

    return name, email, message.strip()


# ─── API Client ─────────────────────────────────────────

API_KEY = 'spg_xxxxxxxxxxxx'  # dari admin
BASE_URL = 'https://saweria-pg.roubot71.workers.dev'


def create_payment(amount):
    name, email, message = generate_donatur()

    res = requests.post(f'{BASE_URL}/api/v1/payment', json={
        'amount': amount,
        'message': message,
        'customer_name': name,
        'customer_email': email,
    }, headers={
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
    })

    return res.json()


def check_payment(transaction_id):
    res = requests.get(
        f'{BASE_URL}/api/v1/payment/{transaction_id}',
        headers={'X-API-Key': API_KEY},
    )
    return res.json()


def wait_for_payment(transaction_id, interval=5, timeout=900):
    start = time.time()

    while time.time() - start < timeout:
        data = check_payment(transaction_id)['data']

        if data['status'] == 'paid':
            return data
        if data['status'] in ('expired', 'failed'):
            raise Exception(f"Payment {data['status']}")

        time.sleep(interval)

    raise Exception('Payment timeout')


# ─── Contoh Penggunaan ──────────────────────────────────

payment = create_payment(25000)
print('QR String:', payment['data']['qr_string'])
print('Transaction ID:', payment['data']['transaction_id'])

result = wait_for_payment(payment['data']['transaction_id'])
print('Pembayaran berhasil!', result)
```

---

## Contoh Implementasi (PHP)

```php
<?php

// ─── Scramble System ────────────────────────────────────

$names = [
    'Rizki', 'Dewi', 'Andi', 'Sari', 'Budi', 'Putri', 'Fajar', 'Nisa',
    'Dimas', 'Ayu', 'Raka', 'Lina', 'Yoga', 'Mega', 'Bayu', 'Rina',
    'Arif', 'Wulan', 'Dani', 'Tika', 'Hendra', 'Sinta', 'Galih', 'Indah',
    'Eko', 'Ratna', 'Agus', 'Fitri', 'Joko', 'Yuni', 'Wahyu', 'Dina',
    'Rendi', 'Citra', 'Ilham', 'Novi', 'Surya', 'Lia', 'Adi', 'Rini',
    'Taufik', 'Anisa', 'Feri', 'Lestari', 'Bambang', 'Nurul', 'Irfan',
    'Siti', 'Rahmat', 'Wati', 'Gilang', 'Aisyah', 'Rangga', 'Melati',
    'Fikri', 'Zahra', 'Doni', 'Kartika', 'Hadi', 'Laras', 'Yusuf',
    'Amira', 'Bagus', 'Tiara', 'Rian', 'Nabila', 'Aldi', 'Intan',
    'Faisal', 'Aulia', 'Reza', 'Dinda', 'Hafiz', 'Salma', 'Iqbal',
    'Kirana', 'Adit', 'Nadia', 'Farhan', 'Cantika', 'Ridho', 'Shinta',
    'Alvin', 'Mira', 'Zaki', 'Bella', 'Dafa', 'Rani', 'Gibran', 'Tasya',
    'Naufal', 'Vina', 'Rafli', 'Winda', 'Aziz', 'Della', 'Kemal', 'Yanti',
    'Lutfi', 'Anggi',
];

$domains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'yahoo.co.id',
    'protonmail.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com',
    'aol.com', 'gmx.com', 'live.com', 'msn.com', 'inbox.com',
    'fastmail.com', 'tutanota.com', 'pm.me', 'outlook.co.id', 'rocketmail.com',
];

$messages = [
    'Semangat terus kak!', 'Sukses selalu ya', 'Mantap kontennya',
    'Lanjutkan kak', 'Keren bgt dah', 'Semoga makin sukses',
    'Gas terus kak!', 'Suka bgt kontennya', 'Terus berkarya ya!',
    'Ditunggu konten barunya', 'Keren kak', 'Semangat ya kak',
    'Lanjut terus!', 'Mantap bgt!', 'Sukses terus ya',
    'Keep it up!', 'Bagus bgt kak', 'Top dah', 'Salut kak!',
    'Inspiratif bgt', 'Keren parah sih', 'Semangat trs ya',
    'Gaskeun kak!', 'Kontennya bagus bgt', 'Sering2 live ya kak',
    'Ditunggu karya selanjutnya', 'Makin keren aja',
    'Supportmu selalu kak', 'Jangan nyerah ya!', 'Proud of you kak',
];

$emojis = ['', '', ' 🔥', ' 💪', ' 🎉', ' 👍', ' ❤️', ' ✨', ' 💯', ' 🙌'];
$suffixes = ['', '', '!', '!!', ' ya', ' kak', ' bgt', ' dong'];

function scrambleName($name) {
    $chars = str_split($name);
    shuffle($chars);
    $result = implode('', $chars);
    return ucfirst(strtolower($result));
}

function generateDonatur() {
    global $names, $domains, $messages, $emojis, $suffixes;

    $baseName = $names[array_rand($names)];
    $name = rand(0, 1) ? scrambleName($baseName) : $baseName;

    $domain = $domains[array_rand($domains)];
    $digits = rand(100, 99999);
    $email = strtolower($name) . $digits . '@' . $domain;

    $message = $messages[array_rand($messages)]
        . $emojis[array_rand($emojis)]
        . $suffixes[array_rand($suffixes)];

    return [$name, $email, trim($message)];
}

// ─── Config ─────────────────────────────────────────────

$apiKey = 'spg_xxxxxxxxxxxx'; // dari admin
$baseUrl = 'https://saweria-pg.roubot71.workers.dev';

// ─── Buat Payment ───────────────────────────────────────

function createPayment($amount) {
    global $apiKey, $baseUrl;
    [$name, $email, $message] = generateDonatur();

    $ch = curl_init("$baseUrl/api/v1/payment");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "X-API-Key: $apiKey",
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $amount,
            'message' => $message,
            'customer_name' => $name,
            'customer_email' => $email,
        ]),
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// ─── Cek Status ─────────────────────────────────────────

function checkStatus($transactionId) {
    global $apiKey, $baseUrl;

    $ch = curl_init("$baseUrl/api/v1/payment/$transactionId");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["X-API-Key: $apiKey"],
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// ─── Contoh ─────────────────────────────────────────────

$payment = createPayment(25000);
echo "QR: " . $payment['data']['qr_string'] . "\n";
echo "ID: " . $payment['data']['transaction_id'] . "\n";

// Poll status
while (true) {
    $status = checkStatus($payment['data']['transaction_id']);
    if ($status['data']['status'] === 'paid') {
        echo "Pembayaran berhasil!\n";
        break;
    }
    if (in_array($status['data']['status'], ['expired', 'failed'])) {
        echo "Pembayaran gagal: " . $status['data']['status'] . "\n";
        break;
    }
    sleep(5);
}
```

---

## Error Codes

| HTTP Status | Keterangan |
|---|---|
| 200 | Sukses |
| 201 | Payment berhasil dibuat |
| 400 | Request tidak valid (amount < 1000, field kosong) |
| 401 | API key salah atau tidak aktif |
| 404 | Transaksi tidak ditemukan |
| 429 | Rate limit — terlalu banyak request |
| 502 | Saweria sedang error / proxy gagal |

---

## Tips & Best Practices

1. **Selalu scramble** — nama, email, pesan harus unik setiap request
2. **Jeda antar request** — minimal 3 detik antar create payment
3. **Poll status** — tiap 5 detik, jangan lebih cepat
4. **QR expired** — setelah ~15 menit, buat baru kalau expired
5. **Simpan `transaction_id`** — di database kamu untuk tracking
6. **Gunakan `reference_id`** — untuk mapping ke order/invoice di sistem kamu
7. **Set webhook** — supaya ga perlu polling terus, kami notify otomatis
8. **Jangan hardcode data donatur** — selalu generate random setiap request
