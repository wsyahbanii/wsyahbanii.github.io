# Web Guard Relay — Cloudflare Worker

Relay ini menerima laporan dari `assets/js/guard.js` lalu mengirim **Email** + **WhatsApp**.
Karena secret disimpan di Worker, repo GitHub kamu tetap aman (tidak ada API key di JS publik).

---

## 1. Prasyarat

```bash
npm install -g wrangler
wrangler login
```

---

## 2. Deploy (5 menit)

```bash
cd worker
wrangler deploy
```

Setelah deploy kamu dapat URL seperti:

```
https://ws-guard-relay.<subdomain>.workers.dev
```

---

## 3. Set Secret

```bash
# Wajib — samakan dengan relaySecret di guard.config.js
wrangler secret put SHARED_SECRET

# Email (Resend — gratis 100 email/hari, https://resend.com)
wrangler secret put RESEND_API_KEY

# WhatsApp — pilih salah satu provider:

# (A) CallMeBot  → gratis, paling mudah
#     Kirim WA: "I allow callmebot to send me messages" ke +34 644 51 95 23
#     Bot membalas dengan API key
wrangler secret put CALLMEBOT_API_KEY

# (B) Fonnte     → populer di Indonesia, berbayar murah, https://fonnte.com
wrangler secret put FONNTE_TOKEN

# (C) Twilio WhatsApp API → berbayar
wrangler secret put TWILIO_SID
wrangler secret put TWILIO_TOKEN
wrangler secret put TWILIO_WA_FROM
```

Ubah `WA_PROVIDER` di `wrangler.toml` sesuai provider yang dipakai (`callmebot` / `fonnte` / `twilio`), lalu `wrangler deploy` ulang.

---

## 4. Hubungkan ke Website

Edit `assets/js/guard.config.js`:

```js
relayUrl: 'https://ws-guard-relay.<subdomain>.workers.dev/ingest',
relaySecret: 'nilai-yang-sama-dengan-SHARED_SECRET',
```

Commit & push. Selesai — alert aktif.

---

## 5. Uji Coba

```bash
curl -X POST "https://ws-guard-relay.<subdomain>.workers.dev/ingest" \
  -H "Content-Type: application/json" \
  -H "X-Guard-Secret: <SHARED_SECRET>" \
  -d "{\"kind\":\"intrusion\",\"site\":\"wsyahbanii.my.id\",\"report\":{\"severity\":\"TEST\",\"score\":99,\"path\":\"/test\",\"signals\":[{\"label\":\"Uji coba\",\"score\":99}],\"intel\":{\"ip\":\"8.8.8.8\"},\"client\":{\"ua\":\"curl-test\"}},\"email\":{\"text\":\"Ini tes.\"},\"whatsapp\":{\"text\":\"Ini tes.\"}}"
```

Kalau email + WA masuk → sistem berjalan.

---

## 6. Mode Lanjutan — Edge Firewall (opsional, paling kuat)

Scanner seperti `nmap`, `sqlmap`, `dirsearch` **tidak menjalankan JavaScript**, jadi `guard.js`
tidak bisa melihatnya. Worker bisa — dia melihat **setiap request HTTP** sebelum sampai ke GitHub Pages.

Syarat: DNS domain di-proxy Cloudflare (orange cloud).

1. Pindahkan nameserver domain ke Cloudflare.
2. Tambahkan record GitHub Pages seperti biasa (A / CNAME), proxy **ON**.
3. SSL/TLS → mode **Full**.
4. Tambahkan route Worker:

   Cloudflare Dashboard → Workers & Pages → `ws-guard-relay` → Settings → Triggers →
   **Add route**: `wsyahbanii.my.id/*` dan `www.wsyahbanii.my.id/*`

5. Aktifkan pemblokiran: set `BLOCK_MODE = "on"` di `wrangler.toml` → `wrangler deploy`.

Sekarang setiap request ke domain melewati dua lapis:
**edge (Worker)** → deteksi + blokir, lalu **client (guard.js)** → deteksi + reverse-IP + countermeasure.

---

## 7. Struktur Data Laporan

```jsonc
{
  "kind": "intrusion" | "decoy-credential",
  "site": "wsyahbanii.my.id",
  "report": {
    "ts": "2026-...",
    "tsLocal": "... WIB",
    "severity": "CRITICAL | HIGH | MEDIUM | LOW",
    "score": 145,
    "url": "https://...",
    "path": "/.env",
    "query": "?id=1' OR 1=1--",
    "signals": [{ "id": "sqli", "label": "...", "severity": "critical", "score": 60, "evidence": "..." }],
    "intel": { "ip": "..", "isp": "..", "asn": "..", "city": "..", "country": "..", "maps": ".." },
    "client": { "ua": "..", "fp": "..", "gpu": ".." }
  }
}
```
