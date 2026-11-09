/**
 * live-e2e-test.mjs — uji END-TO-END memakai kode yang SUDAH LIVE di situs.
 *
 * Mengambil guard.config.js + guard.js langsung dari https://wsyahbanii.my.id,
 * menjalankannya dengan skenario serangan nyata, lalu membuktikan apakah
 * alert email benar-benar terkirim.
 *
 * Berbeda dari guard-selftest.mjs (yang memakai file lokal), tes ini menguji
 * apa yang sebenarnya disajikan ke pengunjung.
 *
 * Jalankan: node tools/live-e2e-test.mjs
 */
import vm from 'node:vm';

const BASE = 'https://wsyahbanii.my.id';
const ATTACK = BASE + "/?id=1'%20OR%201=1--%20UNION%20SELECT%20password%20FROM%20users";

const out = { emailjs: null, geo: null, relay: null };
let pass = 0, fail = 0;
const assert = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}`); }
  else { fail++; console.log(`  \x1b[31mFAIL\x1b[0m ${name} ${extra}`); }
};

console.log('\n\x1b[1mLive E2E — menguji kode yang sudah live\x1b[0m');
console.log('Target :', BASE, '\n');

/* ---------- 1. ambil kode live ---------- */
const cfgRes = await fetch(BASE + '/assets/js/guard.config.js');
const jsRes = await fetch(BASE + '/assets/js/guard.js');
const cfgSrc = await cfgRes.text();
const guardSrc = await jsRes.text();

assert('guard.config.js live terjangkau', cfgRes.ok, `HTTP ${cfgRes.status}`);
assert('guard.js live terjangkau', jsRes.ok, `HTTP ${jsRes.status}`);
assert('guard.js live berisi mesin deteksi', guardSrc.includes('buildReport') && guardSrc.includes('reverseIntel'));
assert('guard.config.js live mengaktifkan emailjs', /emailjs:\s*\{[\s\S]*?enabled:\s*true/.test(cfgSrc));

/* ---------- 2. sandbox DOM minimal ---------- */
const u = new URL(ATTACK);
const store = new Map();

function el() {
  return {
    style: {}, setAttribute() {}, addEventListener() {},
    getContext: () => null,
    toDataURL: () => { throw new Error('no-canvas'); }
  };
}

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Date, Promise, Object, Array, String, Number, Math, JSON, RegExp, Error, Intl, URLSearchParams,
  AbortController,
  setTimeout: (fn) => 0,
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  document: {
    readyState: 'complete',
    title: 'Wahyu Syahbani',
    referrer: '',
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {} }, innerHTML: '' },
    head: { appendChild() {} },
    body: { appendChild() {} },
    addEventListener() {},
    createElement: el,
    getElementById: () => null
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    language: 'id-ID', languages: ['id-ID', 'en'], platform: 'Win32',
    hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0,
    plugins: { length: 3 }, webdriver: false
  },
  screen: { width: 1920, height: 1080, colorDepth: 24, availWidth: 1920, availHeight: 1040 },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
  },
  location: { href: ATTACK, pathname: u.pathname, search: u.search, hash: '' },
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  addEventListener() {}
};

/* fetch nyata, tapi rekam panggilan ke geo API & relay */
sandbox.fetch = async (url, opts) => {
  const s = String(url);
  if (s.includes('ipwho.is') || s.includes('ipapi.co') || s.includes('ip-api.com')) {
    out.geo = (out.geo || 0) + 1;
  }
  if (s.includes('/ingest') || (sandbox.GUARD_CONFIG && s === sandbox.GUARD_CONFIG.relayUrl)) {
    out.relay = s;
  }
  return fetch(url, opts);
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

/* Tiruan SDK EmailJS browser: di balik layar SDK ini POST ke api.emailjs.com.
   Shim ini melakukan hal yang sama persis, plus header Origin seperti browser. */
const P = { publicKey: null };
sandbox.emailjs = {
  init(cfg) { P.publicKey = cfg.publicKey || cfg.userID; },
  async send(serviceId, templateId, params) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE,
        'Referer': BASE + '/',
        'User-Agent': sandbox.navigator.userAgent
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: P.publicKey,
        template_params: params
      })
    });
    const text = await res.text();
    out.emailjs = { status: res.status, body: text.trim(), params };
    if (!res.ok) throw new Error('emailjs ' + res.status + ' ' + text);
    return { status: res.status, text };
  }
};

vm.createContext(sandbox);

/* ---------- 3. jalankan kode live ---------- */
vm.runInContext(cfgSrc, sandbox);
sandbox.GUARD_CONFIG.reportOnLoad = false;   // kita panggil manual
sandbox.fetch = sandbox.fetch;
vm.runInContext(guardSrc, sandbox);

assert('WSGuard terpasang di window', !!sandbox.WSGuard);
assert('konfigurasi live: emailjs aktif', sandbox.GUARD_CONFIG.emailjs.enabled === true);
assert('konfigurasi live: tujuan email benar',
  sandbox.GUARD_CONFIG.alertEmail === 'wahyuusyahbanii@gmail.com',
  sandbox.GUARD_CONFIG.alertEmail);

/* ---------- 4. tembak skenario serangan ---------- */
console.log('\nMenjalankan skenario serangan: SQL Injection\n');
const t0 = Date.now();
const report = await sandbox.WSGuard.scan();
const ms = Date.now() - t0;

assert('serangan terdeteksi', !!report);
assert('rule sqli muncul', report && report.signals.some((s) => s.id === 'sqli'));
assert('severity minimal HIGH', report && /HIGH|CRITICAL/.test(report.severity), report && report.severity);
assert('reverse-IP dijalankan', (out.geo || 0) > 0, `panggilan geo: ${out.geo}`);
assert('IP penyerang ter-resolve', report && !!report.intel.ip, report && String(report.intel.ip));
assert('lokasi ter-resolve', report && !!report.intel.country, report && String(report.intel.country));

console.log('\n--- Isi alert yang dikirim ---');
console.log('IP       :', report && report.intel.ip);
console.log('Lokasi   :', report && [report.intel.city, report.intel.region, report.intel.country].filter(Boolean).join(', '));
console.log('ISP      :', report && report.intel.isp);
console.log('ASN      :', report && report.intel.asn);
console.log('Maps     :', report && report.intel.maps);
console.log('Severity :', report && report.severity, '(' + (report && report.score) + ' poin)');
console.log('Durasi   :', ms, 'ms');

console.log('\n--- Pengiriman EmailJS ---');
if (out.emailjs) {
  console.log('HTTP', out.emailjs.status, out.emailjs.body);
} else {
  console.log('(tidak terpanggil)');
}
assert('email alert terkirim dari kode live', out.emailjs && out.emailjs.status === 200,
  out.emailjs ? 'HTTP ' + out.emailjs.status + ' ' + out.emailjs.body : 'tidak terpanggil');
assert('email memuat IP penyerang', out.emailjs && String(out.emailjs.params.ip).length > 0);
assert('email memuat lokasi penyerang', out.emailjs && String(out.emailjs.params.location).length > 0);

console.log(`\n\x1b[1mHasil: ${pass} lulus, ${fail} gagal\x1b[0m\n`);
process.exit(fail ? 1 : 0);
