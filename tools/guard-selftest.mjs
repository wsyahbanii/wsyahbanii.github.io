/**
 * guard-selftest.mjs — uji mesin deteksi guard.js tanpa browser.
 * Jalankan:  node tools/guard-selftest.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const assert = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}`); }
  else { fail++; console.log(`  \x1b[31mFAIL\x1b[0m ${name} ${extra}`); }
};

/* ---------- sandbox DOM minimal ---------- */
function makeSandbox({ url, ua, referrer, ctx = null, geo = null }) {
  const store = new Map();
  const doc = {
    readyState: 'complete',
    title: '',
    referrer,
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {} }, innerHTML: '' },
    head: { appendChild() {} },
    body: { appendChild() {} },
    addEventListener() {},
    createElement() {
      return {
        style: {}, setAttribute() {},
        getContext: () => null,
        toDataURL: () => { throw new Error('no canvas'); },
        addEventListener() {}
      };
    },
    getElementById: () => null
  };

  const sandbox = {
    console,
    Date, Promise, Object, Array, String, Number, Math, JSON, RegExp, Error,
    URLSearchParams,
    Intl,
    setTimeout: (fn) => { /* tidak dijalankan otomatis */ return 0; },
    clearTimeout: () => {},
    requestAnimationFrame: () => {},
    AbortController,
    fetch: async (u) => {
      if (geo && String(u).includes('ipwho.is')) return { json: async () => geo };
      if (geo && String(u).includes('ip-api.com')) return { json: async () => ({ status: 'fail' }) };
      if (geo && String(u).includes('ipapi.co')) return { json: async () => ({}) };
      if (String(u).includes('dns.google')) return { json: async () => ({ Answer: [{ data: 'ptr.example.net' }] }) };
      return { json: async () => ({}), ok: true };
    },
    document: doc,
    navigator: {
      userAgent: ua, language: 'id-ID', languages: ['id-ID', 'en'],
      platform: 'Win32', hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0,
      plugins: { length: 0 }, webdriver: false
    },
    screen: { width: 1920, height: 1080, colorDepth: 24, availWidth: 1920, availHeight: 1040 },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k)
    },
    location: { href: url, pathname: new URL(url).pathname, search: new URL(url).search, hash: '' },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    __GUARD_CTX: ctx,
    addEventListener() {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function runGuard(opts) {
  const sandbox = makeSandbox(opts);
  vm.runInContext(read('assets/js/guard.config.js'), sandbox);
  sandbox.GUARD_CONFIG.reportOnLoad = false;
  sandbox.GUARD_CONFIG.debug = false;
  sandbox.GUARD_CONFIG.relayUrl = '';
  sandbox.GUARD_CONFIG.callmebot = { enabled: false };
  sandbox.GUARD_CONFIG.emailjs = { enabled: false };
  sandbox.GUARD_CONFIG.countermeasures = { enabled: false };
  sandbox.fetch = async (u, o) => {
    if (String(u).includes('ipwho.is')) {
      return { ok: true, json: async () => ({ success: true, ip: '45.155.205.233', city: 'Sofia', region: 'Sofia', country: 'Bulgaria', country_code: 'BG', latitude: 42.7, longitude: 23.3, connection: { isp: 'Biterika Group', org: 'Xhost Internet Solutions LP', asn: 213292, type: 'hosting' }, security: { proxy: false, vpn: true, tor: false, hosting: true } }) };
    }
    if (String(u).includes('dns.google')) return { ok: true, json: async () => ({ Answer: [{ data: 'scan45.hostile.net' }] }) };
    return { ok: true, json: async () => ({}) };
  };
  vm.runInContext(read('assets/js/guard.js'), sandbox);
  return sandbox;
}

/* ---------- tes ---------- */
console.log('\n\x1b[1mWeb Guard — Self Test\x1b[0m\n');

console.log('1) Request bersih (manusia normal)');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36', referrer: '' });
  const r = await sb.WSGuard.scan();
  assert('skor di bawah ambang (tidak ada alert palsu)', r === null, `skor=${r && r.score}`);
}

console.log('\n2) SQL Injection di query string');
{
  const sb = runGuard({ url: "https://wsyahbanii.my.id/?id=1'%20OR%201=1--%20UNION%20SELECT%20password%20FROM%20users", ua: 'Mozilla/5.0 Chrome/131', referrer: '' });
  const r = await sb.WSGuard.scan();
  assert('insiden terdeteksi', !!r);
  assert('severity minimal HIGH', r && (r.severity === 'HIGH' || r.severity === 'CRITICAL'), r && r.severity);
  assert('rule sqli muncul', r && r.signals.some(s => s.id === 'sqli'));
}

console.log('\n3) Scanner UA + probing /.env');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/.env', ua: 'sqlmap/1.7.2#stable (https://sqlmap.org)', referrer: '' });
  const r = await sb.WSGuard.scan();
  assert('terdeteksi kritikal', r && r.severity === 'CRITICAL', r && r.severity);
  assert('rule scanner-ua muncul', r && r.signals.some(s => s.id === 'scanner-ua'));
  assert('rule recon (file/panel probe) muncul', r && r.signals.some(s => s.id === 'recon'));
}

console.log('\n4) Honeypot tersentuh + reverse-IP intel');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/', ua: 'Mozilla/5.0 Chrome/131', referrer: '' });
  const r = await sb.WSGuard.scan({ honeypot: 'link:/wp-admin' });
  assert('insiden himpun honeypot', r && r.signals.some(s => s.id === 'honeypot'));
  assert('IP penyerang ter-resolve', r && r.intel.ip === '45.155.205.233', r && r.intel.ip);
  assert('lokasi & ISP terbaca', r && r.intel.city === 'Sofia' && !!r.intel.isp, r && r.intel.city);
  assert('reverse DNS terbaca', r && r.intel.ptr === 'scan45.hostile.net');
  assert('flag VPN/Hosting terdeteksi', r && (r.intel.vpn || r.intel.hosting));
  assert('link Google Maps dibentuk', r && /google\.com\/maps/.test(r.intel.maps || ''));
}

console.log('\n5) XSS + path traversal + command injection');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/?x=%3Cscript%3Ealert(1)%3C/script%3E&f=../../../../etc/passwd&c=;cat%20/etc/shadow', ua: 'Mozilla/5.0 Chrome/131', referrer: '' });
  const r = await sb.WSGuard.scan();
  assert('XSS terdeteksi', r && r.signals.some(s => s.id === 'xss'));
  assert('LFI/traversal terdeteksi', r && r.signals.some(s => s.id === 'lfi'));
  assert('command injection terdeteksi', r && r.signals.some(s => s.id === 'cmdi'));
  assert('skor >= 90 (critical)', r && r.score >= 90, r && r.score);
}

console.log('\n6) Halaman 404 (honeypot halaman)');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/wp-login.php', ua: 'Mozilla/5.0 Chrome/131', referrer: '', ctx: { is404: true, requestedPath: '/wp-login.php' } });
  const r = await sb.WSGuard.scan();
  assert('404-scan terdeteksi', r && r.signals.some(s => s.id === '404-scan'));
}

console.log('\n7) Anti-spam: alert kedua ditahan cooldown');
{
  const sb = runGuard({ url: 'https://wsyahbanii.my.id/', ua: 'sqlmap/1.7', referrer: '' });
  const r1 = await sb.WSGuard.scan();
  const r2 = await sb.WSGuard.scan();
  assert('scan pertama lolos', !!r1);
  assert('scan kedua ditahan cooldown', r2 === null || r2 === r1);
}

console.log(`\n\x1b[1mHasil: ${pass} lulus, ${fail} gagal\x1b[0m\n`);
process.exit(fail ? 1 : 0);
