/**
 * emailjs-test.mjs — uji jalur alert EmailJS end-to-end.
 * Mengirim email NYATA memakai kredensial dari assets/js/guard.config.js,
 * dengan parameter yang identik dengan sendEmailJS() di guard.js.
 * Kalau tes ini lulus, alert asli dari browser juga akan terkirim.
 *
 * Jalankan: node tools/emailjs-test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* --- baca kredensial langsung dari guard.config.js --- */
const src = fs.readFileSync(path.join(ROOT, 'assets/js/guard.config.js'), 'utf8');
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const CFG = sandbox.GUARD_CONFIG;

const { publicKey, serviceId, templateId, enabled } = CFG.emailjs;
const to = CFG.alertEmail;

console.log('\nEmailJS — uji kirim nyata');
console.log('  publicKey :', publicKey || '(kosong)');
console.log('  serviceId :', serviceId || '(kosong)');
console.log('  templateId:', templateId || '(kosong)');
console.log('  tujuan    :', to, '\n');

if (!enabled || !publicKey || !serviceId || !templateId) {
  console.error('BATAL: enabled=false atau kredensial belum lengkap.');
  process.exit(2);
}

/* --- parameter identik dengan yang dikirim guard.js --- */
const template_params = {
  to_email: to,
  site: CFG.site,
  severity: 'TEST',
  score: 999,
  time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB',
  subject: '[TES] SECURITY ALERT — ' + CFG.site,
  message:
    'Ini email uji dari tools/emailjs-test.mjs.\n' +
    'Kalau kamu menerima ini, jalur alert email Web Guard sudah bekerja.\n\n' +
    '(email ini dikirim oleh tes otomatis, bukan serangan)',
  ip: '8.8.8.8',
  location: 'Mountain View, California, United States',
  isp: 'Google LLC',
  maps: 'https://www.google.com/maps?q=37.3860517,-122.0838511',
  url: 'https://wsyahbanii.my.id/?id=1%27+OR+1%3D1--',
  user_agent: 'node-emailjs-test/1.0'
};

/* --browser : tiru header yang dikirim browser asli (Origin + UA + Referer).
   Ini menguji jalur yang PERSIS dipakai guard.js di situs kamu. */
const asBrowser = process.argv.includes('--browser');
const headers = { 'Content-Type': 'application/json' };
if (asBrowser) {
  headers['Origin'] = 'https://wsyahbanii.my.id';
  headers['Referer'] = 'https://wsyahbanii.my.id/';
  headers['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  console.log('Mode: tiruan browser (Origin + Referer + UA)\n');
} else {
  console.log('Mode: CLI polos\n');
}

const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params
  })
});

const text = await res.text();
console.log('HTTP', res.status);
console.log('body :', text.trim() || '(kosong)');
console.log('');

if (res.ok) {
  console.log('BERHASIL — cek inbox ' + to + ' (termasuk folder Spam).');
  process.exit(0);
}

console.log('GAGAL — arti pesan error:');
const t = text.toLowerCase();
if (t.includes('non-browser')) {
  console.log('  → Toggle "Allow non-browser applications" masih OFF.');
  console.log('    Ini NORMAL untuk tes CLI; browser tetap bisa kirim.');
  console.log('    Untuk lulus tes CLI: EmailJS → Account → Security → aktifkan toggle itu.');
} else if (t.includes('origin')) {
  console.log('  → Origin tidak diizinkan. EmailJS → Account → Security → Allowed origins,');
  console.log('    tambahkan: https://wsyahbanii.my.id dan https://wsyahbanii.github.io');
} else if (t.includes('public key') || t.includes('user_id')) {
  console.log('  → Public Key salah / tidak lengkap.');
} else if (t.includes('service')) {
  console.log('  → Service ID salah, atau service Gmail belum berstatus "connected".');
} else if (t.includes('template')) {
  console.log('  → Template ID salah.');
} else {
  console.log('  → Cek ulang Service ID, Template ID, dan Public Key di dashboard EmailJS.');
}
process.exit(1);
