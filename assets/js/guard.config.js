/*!
 * guard.config.js — Konfigurasi Web Guard (Intrusion Detection & Alert)
 * ---------------------------------------------------------------------
 * Edit file ini saja. Jangan simpan SECRET asli di sini kalau repo publik.
 * Untuk repo publik: pakai relay (Cloudflare Worker) — secret disimpan di Worker.
 * ---------------------------------------------------------------------
 */
window.GUARD_CONFIG = {
  /* --- Identitas --- */
  enabled: true,
  site: 'wsyahbanii.my.id',
  owner: 'Wahyu Syahbani',

  /* --- Tujuan Alert --- */
  alertEmail: 'wahyuusyahbanii@gmail.com',
  alertWhatsApp: '6282223517367', // 082223517367 -> format internasional (tanpa 0, pakai 62)

  /* =====================================================================
   * LEVEL 1 — RELAY (Cloudflare Worker)  ***REKOMENDASI***
   * Isi setelah Worker di-deploy (lihat worker/README.md).
   * Secret disimpan di sisi Worker, bukan di JS publik.
   * ===================================================================== */
  relayUrl: '',        // contoh: 'https://guard.wahyu.workers.dev/ingest'
  relaySecret: '',     // samakan dengan WORKER_SHARED_SECRET di Worker

  /* =====================================================================
   * LEVEL 0 — jalur langsung tanpa backend (opsional, isi kalau tidak pakai Worker)
   * ===================================================================== */

  // EmailJS — kirim email langsung dari browser (public key memang publik)
  emailjs: {
    enabled: true,
    publicKey: 'vEkfJBukKK7hxdRW0',   // EmailJS > Account > General > Public Key
    serviceId: 'service_gv3np1k',   // EmailJS > Email Services > Service ID
    templateId: 'template_rjx7bjk'   // EmailJS > Email Templates > Template ID
  },

  // CallMeBot — kirim WhatsApp langsung dari browser
  // Cara dapat apiKey: kirim WA "I allow callmebot to send me messages" ke +34 644 51 95 23
  callmebot: {
    enabled: false,
    apiKey: ''       // API key CallMeBot kamu
  },

  /* --- Intelijen Reverse-IP (putar balikan IP + lokasi) --- */
  geoApis: [
    'https://ipwho.is/',                 // gratis, tanpa key, kaya data (ISP/ASN/proxy flag)
    'https://ipapi.co/{ip}/json/',       // fallback
    'https://ip-api.com/json/{ip}?fields=status,country,regionName,city,isp,org,as,proxy,hosting,mobile,query'
  ],
  reverseDns: true,                      // PTR lookup via dns.google

  /* --- Ambang deteksi --- */
  thresholds: {
    score: 50,          // total skor minimal untuk dianggap insiden
    critical: 90,       // skor untuk aksi countermeasure
    burst: 12,          // jumlah request dalam window
    burstWindowMs: 10000
  },

  /* --- Dedup / anti-spam alert --- */
  alertCooldownMs: 5 * 60 * 1000,  // 1 alert per (rule+IP) per 5 menit

  /* --- Countermeasure ("putar balikan") --- *
   * Aktif HANYA setelah indikasi kuat bot/penyerang (scanner UA, honeypot, skor critical).
   * tarpit   : menahan CPU tab penyerang (lambat, bukan merusak).
   * decoy    : ganti halaman dengan form login palsu, kredensial yang diketik ikut dilaporkan.
   */
  countermeasures: {
    enabled: true,
    tarpit: true,
    decoy: true,
    tarpitDurationMs: 45000,   // maksimum 45 detik membebani tab penyerang
    tarpitIntensity: 1.6e6     // iterasi per frame — naikkan kalau perlu lebih berat
  },

  /* --- Honeypot: link/field tersembunyi yang tidak mungkin diklik manusia --- */
  honeypots: {
    enabled: true,
    paths: ['/wp-admin', '/wp-login.php', '/.env', '/admin', '/phpmyadmin', '/.git/config']
  },

  /* --- Perilaku lain --- */
  reportOnLoad: true,       // jalankan deteksi saat halaman dibuka
  reportHumanTraffic: false,// true = laporkan SEMUA kunjungan (ribut, jangan default)
  debug: false              // true = log detail ke console
};
