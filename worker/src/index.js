/**
 * Web Guard Relay — Cloudflare Worker
 * -----------------------------------
 * Menerima laporan dari guard.js (browser) DAN melakukan edge inspection
 * (menangkap scanner yang tidak menjalankan JavaScript).
 *
 * Alur:  laporan masuk -> normalisasi -> kirim Email + WhatsApp -> balas JSON
 *
 * Deploy: lihat worker/README.md
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = buildCors(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // --- Mode 1: Endpoint ingest (dipanggil oleh guard.js) ---
    if (url.pathname === '/ingest' || url.pathname === env.INGEST_PATH) {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
      return handleIngest(request, env, cors);
    }

    // --- Mode 2: Edge firewall: inspeksi semua request lain ---
    return handleEdge(request, env, ctx, cors);
  }
};

/* =====================================================================
 * Ingest — laporan dari browser
 * ===================================================================== */
async function handleIngest(request, env, cors) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400, cors); }

  const secret = request.headers.get('X-Guard-Secret') || body.secret || '';
  if (env.SHARED_SECRET && secret !== env.SHARED_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401, cors);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const cf = request.cf || {};
  const kind = body.kind || 'intrusion';

  // Enrich: IP dari edge lebih valid daripada yang dilaporkan browser
  if (body.report && body.report.intel) {
    if (!body.report.intel.ip || body.report.intel.ip === 'unknown') body.report.intel.ip = ip;
    body.report.intel.edgeIp = ip;
    body.report.intel.asn = body.report.intel.asn || (cf.asn ? 'AS' + cf.asn : null);
    body.report.intel.country = body.report.intel.country || cf.country;
    body.report.intel.city = body.report.intel.city || cf.city;
    body.report.intel.edge = {
      asOrganization: cf.asOrganization,
      colo: cf.colo,
      tlsVersion: cf.tlsVersion,
      httpProtocol: cf.httpProtocol,
      botManagement: cf.botManagement || null
    };
  }

  if (kind === 'decoy-credential') {
    await sendAll(env, {
      subject: `🪤 Decoy credential ditangkap — ${body.site || env.SITE_NAME}`,
      text: buildDecoyReport(body, ip, cf)
    });
    return json({ ok: true, kind }, 200, cors);
  }

  await sendAll(env, {
    subject: `🚨 SECURITY ALERT — ${body.site || env.SITE_NAME} — ${(body.report && body.report.severity) || 'UNKNOWN'}`,
    text: (body.email && body.email.text) || JSON.stringify(body.report, null, 2),
    whatsapp: (body.whatsapp && body.whatsapp.text) || null
  });

  return json({ ok: true, delivered: true }, 200, cors);
}

/* =====================================================================
 * Edge firewall — menangkap scanner yang tidak menjalankan JS
 * ===================================================================== */
const EDGE_RULES = [
  { id: 'sqli', re: /(\bunion\b.{0,24}\bselect\b)|(\bor\b\s+1=1)|(sleep\s*\()|(information_schema)/i, sev: 'critical', score: 60 },
  { id: 'xss', re: /(<script|javascript:|onerror\s*=|%3cscript)/i, sev: 'critical', score: 55 },
  { id: 'lfi', re: /(\.\.\/|%2e%2e|\/etc\/passwd|php:\/\/)/i, sev: 'critical', score: 55 },
  { id: 'recon', re: /(\/\.env|\/\.git|wp-admin|wp-login|phpmyadmin|xmlrpc\.php|\/\.aws\/|\/\.ssh\/|composer\.lock|server-status|actuator)/i, sev: 'high', score: 45 },
  { id: 'log4shell', re: /\$\{jndi:/i, sev: 'critical', score: 70 }
];

const SCANNER_UA = /(sqlmap|nikto|nmap|masscan|nessus|acunetix|netsparker|dirbuster|gobuster|ffuf|wfuzz|hydra|metasploit|zgrab|nuclei|wpscan|joomscan|arachni|zaproxy|skipfish|commix|xsstrike|dalfox|w3af|openvas|qualys|python-requests|python-urllib|libwww-perl|go-http-client|curl\/|wget\/|scrapy)/i;

async function handleEdge(request, env, ctx, cors) {
  const ua = request.headers.get('User-Agent') || '';
  const url = new URL(request.url);
  const target = decodeURIComponent(url.pathname + url.search);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const cf = request.cf || {};
  const cf2 = request.headers;

  let score = 0;
  const signals = [];

  for (const r of EDGE_RULES) {
    const m = target.match(r.re);
    if (m) { score += r.score; signals.push({ id: r.id, sev: r.sev, evidence: m[0].slice(0, 120) }); }
  }
  if (SCANNER_UA.test(ua)) { score += 50; signals.push({ id: 'scanner-ua', sev: 'high', evidence: ua.slice(0, 160) }); }

  const bot = cf.botManagement && cf.botManagement.score < 30;

  if (score >= 45) {
    const report = buildEdgeReport({ request, url, target, ua, ip, cf, signals, score, bot });
    ctx.waitUntil(sendAll(env, {
      subject: `🛡️ EDGE BLOCK — ${env.SITE_NAME || url.hostname} — ${signals[0].id.toUpperCase()}`,
      text: report
    }));
    if (env.BLOCK_MODE === 'on') {
      return new Response(blockPage(report), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }

  // Lolos — teruskan ke origin (GitHub Pages)
  return fetch(request);
}

function buildEdgeReport({ request, url, target, ua, ip, cf, signals, score, bot }) {
  const L = [];
  L.push('PERINGATAN KEAMANAN — (edge / server-side)');
  L.push('='.repeat(52));
  L.push('Waktu    : ' + new Date().toISOString());
  L.push('Host     : ' + url.hostname);
  L.push('Request  : ' + request.method + ' ' + target);
  L.push('Skor     : ' + score);
  L.push('');
  L.push('--- PENYERANG ---');
  L.push('IP       : ' + ip);
  L.push('Negara   : ' + (cf.country || '-') + ' / ' + (cf.city || '-') + ' / ' + (cf.region || '-'));
  L.push('Lat/Lon  : ' + (cf.latitude || '-') + ', ' + (cf.longitude || '-'));
  L.push('ASN      : ' + (cf.asn ? 'AS' + cf.asn : '-') + ' — ' + (cf.asOrganization || '-'));
  L.push('Timezone : ' + (cf.timezone || '-'));
  L.push('Bot Score: ' + (cf.botManagement ? cf.botManagement.score : 'n/a'));
  L.push('TLS      : ' + (cf.tlsVersion || '-') + ' | ' + (cf.httpProtocol || '-'));
  L.push('');
  L.push('--- INDIKATOR ---');
  signals.forEach(s => L.push('[' + s.sev.toUpperCase() + '] ' + s.id + ' → ' + s.evidence));
  L.push('');
  L.push('--- HEADER MENARIK ---');
  ['Accept', 'Accept-Language', 'Referer', 'X-Forwarded-For', 'X-Real-IP'].forEach(h => {
    const v = request.headers.get(h);
    if (v) L.push(h + ': ' + v);
  });
  L.push('User-Agent: ' + ua);
  return L.join('\n');
}

function buildDecoyReport(body, ip, cf) {
  const d = body.decoy || {};
  return [
    '🪤 DECOY CREDENTIAL DITANGKAP',
    '='.repeat(52),
    'Halaman : ' + (body.site || ''),
    'Waktu   : ' + new Date().toISOString(),
    'IP      : ' + ip,
    'Lokasi  : ' + (cf.city || '-') + ', ' + (cf.country || '-'),
    'ASN     : ' + (cf.asn ? 'AS' + cf.asn : '-') + ' — ' + (cf.asOrganization || '-'),
    '',
    'Username : ' + (d.username || '(kosong)'),
    'Password : ' + (d.password || '(kosong)'),
    '',
    'Penyerang mengisi form login palsu — target mereka salah alamat.'
  ].join('\n');
}

function blockPage(report) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>403 — Akses Ditolak</title>
<style>body{background:#0d0f13;color:#e8e8e8;font-family:ui-monospace,Menlo,monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.b{max-width:520px;padding:32px;border:1px solid #222833;border-radius:12px;background:#14171d}
h1{color:#ff6b6b;font-size:18px;margin:0 0 10px}pre{font-size:11.5px;color:#8b97a8;white-space:pre-wrap;word-break:break-all;max-height:320px;overflow:auto}</style></head>
<body><div class="b"><h1>403 — Permintaan kamu tercatat.</h1><p style="color:#7c8798;font-size:13px">Request ini terdeteksi sebagai aktivitas pemindaian/serangan dan sudah dicatat beserta alamat IP kamu.</p>
<pre>${escapeHtml(report)}</pre></div></body></html>`;
}

/* =====================================================================
 * Pengiriman
 * ===================================================================== */
async function sendAll(env, msg) {
  const jobs = [];
  jobs.push(sendEmail(env, msg));
  if (env.WA_PROVIDER) jobs.push(sendWhatsApp(env, msg));
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) jobs.push(sendTelegram(env, msg));
  const results = await Promise.allSettled(jobs);
  return results;
}

async function sendEmail(env, msg) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return { skipped: 'email_not_configured' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ALERT_FROM || ('Web Guard <onboarding@resend.dev>'),
      to: [env.ALERT_EMAIL],
      subject: msg.subject,
      text: msg.text
    })
  });
  if (!res.ok) console.error('resend error', res.status, await res.text());
  return { ok: res.ok };
}

async function sendWhatsApp(env, msg) {
  const text = msg.whatsapp || msg.text;
  if (env.WA_PROVIDER === 'callmebot') {
    const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent('+' + env.ALERT_WHATSAPP) +
      '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(env.CALLMEBOT_API_KEY);
    const r = await fetch(url);
    return { ok: r.ok };
  }
  if (env.WA_PROVIDER === 'fonnte') {
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': env.FONNTE_TOKEN },
      body: new URLSearchParams({ target: env.ALERT_WHATSAPP, message: text })
    });
    return { ok: r.ok };
  }
  if (env.WA_PROVIDER === 'twilio') {
    const auth = btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN);
    const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env.TWILIO_SID + '/Messages.json', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: 'whatsapp:' + env.TWILIO_WA_FROM,
        To: 'whatsapp:+' + env.ALERT_WHATSAPP,
        Body: text
      })
    });
    return { ok: r.ok };
  }
  return { skipped: 'wa_provider_unknown' };
}

async function sendTelegram(env, msg) {
  const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg.subject + '\n\n' + msg.text, disable_web_page_preview: true })
  });
  return { ok: r.ok };
}

/* =====================================================================
 * Util
 * ===================================================================== */
function buildCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok && origin ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Guard-Secret',
    'Access-Control-Max-Age': '86400'
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
