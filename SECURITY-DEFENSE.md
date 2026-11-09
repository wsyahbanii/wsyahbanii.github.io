# 🛡️ Web Guard — Sistem Pertahanan & Alert Keamanan

Sistem deteksi peretasan untuk **wsyahbanii.my.id**.
Begitu ada yang mencoba meretas situs kamu, sistem otomatis:

1. 🔍 **Mendeteksi** pola serangan (SQLi, XSS, LFI, command injection, scanner, dll.)
2. 🌐 **Memutar balik IP penyerang** — cek lokasi, ISP, ASN, koordinat, VPN/proxy/hosting
3. 📧 **Kirim email ALERT** ke `wahyuusyahbanii@gmail.com`
4. 📱 **Kirim WhatsApp ALERT** ke `082223517367`
5. 🪤 **(Opsional) Balas balik** — tarpit + form login palsu yang menangkap kredensial penyerang

---

## ⚠️ Kenyataan Teknis Dulu (baca 30 detik)

GitHub Pages itu **hosting statis** — tidak ada server, tidak ada backend, tidak ada log access.
Artinya: **tidak mungkin** web kamu sendiri "memblokir" hacker di sisi server.

Jadi pertahanan dibangun **berlapis**:

| Lapis | Lokasi | Kekuatan | Menangkap siapa |
|---|---|---|---|
| **Lapis 1** | Browser (`guard.js`) | Deteksi payload, reverse-IP, alert, countermeasure | Penyerang yang membuka situs (browser/bot-JS) |
| **Lapis 2** | Halaman 404 (`404.html`) | Honeypot — semua path ngawur terjaring | Scanner yang JS-nya jalan + bot pahami |
| **Lapis 3** | Cloudflare Worker | Inspeksi **setiap request HTTP** sebelum sampai GitHub | `nmap`, `sqlmap`, `dirsearch`, scanner tanpa JS — **lapis paling kuat** |

Lapis 1 + 2 **langsung aktif** begitu di-push. Lapis 3 butuh setup ~10 menit (lihat bagian bawah).

---

## 🚀 Cara Aktifkan (Level 1 — 5 menit, tanpa backend)

### Opsi A — Via Cloudflare Worker (REKOMENDASI, aman untuk repo publik)

Key/secret tidak pernah tersimpan di JS publik. Ikuti panduan lengkap di
**[`worker/README.md`](worker/README.md)** lalu isi `assets/js/guard.config.js`:

```js
relayUrl: 'https://ws-guard-relay.<subdomain>.workers.dev/ingest',
relaySecret: 'secret-yang-sama-dengan-Worker',
```

### Opsi B — Tanpa Backend (jalur langsung dari browser)

Semua berjalan di browser, tanpa server. Cocok kalau kamu tidak mau pakai Cloudflare.

**1. Email — pakai EmailJS (gratis 200 email/bulan)**

1. Daftar di [emailjs.com](https://www.emailjs.com/)
2. **Email Services** → Add Service → Gmail → hubungkan `wahyuusyahbanii@gmail.com`
3. **Email Templates** → Create Template. Isi template dengan variabel:

   ```
   Subject:  🚨 SECURITY ALERT — {{site}} — {{severity}}

   Ada percobaan peretasan di website kamu!

   Waktu      : {{time}}
   Severity   : {{severity}} ({{score}} poin)
   Halaman    : {{url}}
   IP Penyerang: {{ip}}
   Lokasi     : {{location}}
   ISP        : {{isp}}
   Peta       : {{maps}}
   User-Agent : {{user_agent}}

   {{message}}
   ```

4. **Account → General → Public Key** (salin)
5. Isi `guard.config.js`:

   ```js
   emailjs: {
     enabled: true,
     publicKey: 'PUBLIC_KEY_KAMU',
     serviceId: 'SERVICE_ID_KAMU',
     templateId: 'TEMPLATE_ID_KAMU'
   }
   ```
   > Public Key EmailJS memang untuk publik — aman.

**2. WhatsApp — pakai CallMeBot (gratis)**

1. Dari WhatsApp yang pegang nomor **082223517367**, kirim pesan ke:
   **+34 644 51 95 23** dengan teks persis:
   ```
   I allow callmebot to send me messages
   ```
2. Bot membalas dengan **API key** (contoh: `123456`)
3. Isi `guard.config.js`:

   ```js
   callmebot: { enabled: true, apiKey: '123456' }
   ```

**3. Commit & push.** Selesai — alert aktif.

---

## 🔥 Tes Sistem (wajib dilakukan sekali)

Setelah push, kunjungi URL berikut dan tunggu ±5 detik:

```
https://wsyahbanii.my.id/?id=1' OR 1=1-- UNION SELECT password FROM users
```

Yang seharusnya terjadi:

- ✅ Email masuk ke `wahyuusyahbanii@gmail.com`
- ✅ WhatsApp masuk ke `082223517367`
- ✅ Isinya: IP kamu, kota, ISP, koordinat, link Google Maps, dan bukti payload

Kalau tidak ada yang masuk → cek Console browser (F12) untuk error, dan pastikan
`enabled: true` serta minimal satu kanal (`relayUrl` / `emailjs` / `callmebot`) sudah diisi.

---

## 🧠 Apa yang Dideteksi?

| Rule | Contoh | Skor |
|---|---|---|
| `sqli` | `?id=1' OR 1=1-- UNION SELECT` | 60 |
| `xss` | `?q=<script>alert(1)</script>` | 55 |
| `lfi` | `?file=../../../../etc/passwd` | 55 |
| `cmdi` | `?cmd=;cat /etc/shadow` | 60 |
| `ssti` / Log4Shell | `${jndi:ldap://...}` | 55 |
| `ssrf` | `?url=http://169.254.169.254/` | 35 |
| `recon` | `/.env`, `/.git/config`, `/wp-admin`, `/phpmyadmin` | 40 |
| `scanner-ua` | UA `sqlmap`, `nuclei`, `nikto`, `gobuster` | 50 |
| `honeypot` | Link tersembunyi tersentuh | 80 |
| `404-scan` | Akses ke path yang tidak ada | 45 |
| `burst` | 12+ request / 10 detik | 45 |

**Skor ≥ 50 → alert dikirim.** Skor ≥ 90 → countermeasure aktif.
Ambang bisa diubah di `guard.config.js` → `thresholds.score`.

---

## 🪤 Countermeasure ("Putar Balikan")

Aktif **hanya** setelah indikasi kuat bot/penyerang (scanner UA, honeypot, atau skor ≥ 90).
Pengunjung normal **tidak pernah** terkena.

- **Tarpit** — tab penyerang dibebani loop CPU selama maks. 45 detik. Browser mereka nge-freeze.
- **Decoy** — halaman diganti form login admin palsu (`Administrator Login`).
  Kredensial yang mereka isi → dikirim ke email kamu dengan subjek
  **"🪤 Decoy credential ditangkap"**.

Matikan kapan saja:

```js
countermeasures: { enabled: false }
```

---

## 📁 Struktur File

```
├── index.html                    # + 2 baris <script> Guard
├── 404.html                      # BARU — honeypot halaman 404
├── assets/
│   ├── fotoKitaBlur.html         # + Guard
│   └── js/
│       ├── guard.config.js       # BARU — semua konfigurasi (EDIT INI)
│       └── guard.js              # BARU — mesin deteksi
├── tools/
│   └── guard-selftest.mjs        # BARU — tes otomatis (node tools/guard-selftest.mjs)
└── worker/
    ├── src/index.js              # BARU — Cloudflare Worker (relay + edge firewall)
    ├── wrangler.toml             # BARU
    └── README.md                 # BARU — panduan deploy
```

---

## 🧪 Jalankan Tes

```bash
node tools/guard-selftest.mjs
```

Hasil yang diharapkan: `20 lulus, 0 gagal`.

---

## 🔐 Rekomendasi Keamanan Tambahan

| # | Aksi | Kenapa |
|---|---|---|
| 1 | Aktifkan **Cloudflare** (ganti nameserver) | Dapat DDoS protection, WAF, bot management, gratis |
| 2 | Aktifkan **2FA** di akun GitHub | Kalau akun GitHub dibobol, seluruh situs dibobol |
| 3 | Pasang **Cloudflare Worker route** (Lapis 3) | Menangkap scanner tanpa JS — inti pertahanan sebenarnya |
| 4 | Jangan commit API key ke repo | `guard.config.js` sebaiknya secret-nya diisi via Worker |
| 5 | Aktifkan `BLOCK_MODE = "on"` di Worker | Scanner langsung dapat 403 di edge |
| 6 | Cek `WSGuard.log()` di Console | Riwayat 50 insiden terakhir tersimpan di browser |

---

## 📊 Cek Riwayat dari Browser

Buka situs, tekan F12 → Console:

```js
WSGuard.log()      // 50 insiden terakhir
WSGuard.report()   // laporan insiden terakhir (lengkap)
WSGuard.intel()    // cek IP kamu sendiri (uji reverse-IP)
WSGuard.scan()     // jalankan pemindaian manual
```

---

*Web Guard v1.0.0 — dibuat untuk wsyahbanii.my.id*
