/*!
 * guard.js — Web Guard: Intrusion Detection, Reverse-IP Intel, Alert, Countermeasure
 * Vanilla JS. Tanpa dependensi. Aman untuk GitHub Pages.
 * Dibuat untuk: wsyahbanii.my.id
 */
(function () {
  'use strict';

  var CFG = window.GUARD_CONFIG || {};
  if (CFG.enabled === false) return;

  var DEFAULTS = {
    site: location.hostname,
    thresholds: { score: 50, critical: 90, burst: 12, burstWindowMs: 10000 },
    alertCooldownMs: 300000,
    countermeasures: { enabled: false, tarpit: false, decoy: false, tarpitDurationMs: 45000, tarpitIntensity: 1.6e6 },
    honeypots: { enabled: false, paths: [] }
  };
  CFG.thresholds = Object.assign({}, DEFAULTS.thresholds, CFG.thresholds || {});
  CFG.countermeasures = Object.assign({}, DEFAULTS.countermeasures, CFG.countermeasures || {});
  CFG.honeypots = Object.assign({}, DEFAULTS.honeypots, CFG.honeypots || {});

  var LS = {
    log: 'ws_guard_log',
    hits: 'ws_guard_hits',
    cooldown: 'ws_guard_cd',
    fp: 'ws_guard_fp'
  };

  function dbg() {
    if (CFG.debug) {
      var a = Array.prototype.slice.call(arguments);
      a.unshift('%c[GUARD]', 'color:#e11;font-weight:bold');
      console.log.apply(console, a);
    }
  }

  function lsGet(k, d) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  /* =====================================================================
   * 1. FINGERPRINT
   * ===================================================================== */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
  }

  function canvasFp() {
    try {
      var c = document.createElement('canvas');
      c.width = 240; c.height = 60;
      var x = c.getContext('2d');
      x.textBaseline = 'top';
      x.font = '14px "Arial"';
      x.fillStyle = '#f60';
      x.fillRect(0, 0, 120, 30);
      x.fillStyle = '#069';
      x.fillText('ws-guard-fp-⚡', 2, 15);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = 'rgba(102,204,0,0.7)';
      x.fillRect(40, 10, 90, 40);
      return c.toDataURL().slice(-96);
    } catch (e) { return 'no-canvas'; }
  }

  function webglInfo() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return { vendor: 'n/a', renderer: 'n/a' };
      var d = gl.getExtension('WEBGL_debug_renderer_info');
      if (!d) return { vendor: 'masked', renderer: 'masked' };
      return { vendor: gl.getParameter(d.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(d.UNMASKED_RENDERER_WEBGL) };
    } catch (e) { return { vendor: 'err', renderer: 'err' }; }
  }

  function buildFingerprint() {
    var g = webglInfo();
    var parts = [
      navigator.userAgent,
      navigator.language,
      (navigator.languages || []).join(','),
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      screen.availWidth + 'x' + screen.availHeight,
      window.devicePixelRatio,
      new Date().getTimezoneOffset(),
      (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      navigator.maxTouchPoints || 0,
      navigator.platform,
      g.vendor + '|' + g.renderer,
      !!navigator.webdriver,
      (navigator.plugins ? navigator.plugins.length : 0),
      canvasFp()
    ].join('~');
    return {
      hash: fnv1a(parts),
      webgl: g,
      screen: screen.width + 'x' + screen.height,
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      languages: (navigator.languages || [navigator.language]).join(','),
      cores: navigator.hardwareConcurrency || null,
      memory: navigator.deviceMemory || null,
      touch: navigator.maxTouchPoints || 0,
      platform: navigator.platform,
      plugins: navigator.plugins ? navigator.plugins.length : 0,
      webdriver: !!navigator.webdriver
    };
  }

  /* =====================================================================
   * 2. REVERSE-IP INTEL  ("putar balikan" IP + lokasi penyerang)
   * ===================================================================== */
  function jget(url, timeout) {
    return new Promise(function (resolve) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); resolve(null); }, timeout || 5000);
      fetch(url, ctrl ? { signal: ctrl.signal } : {})
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(t); resolve(j); })
        .catch(function () { clearTimeout(t); resolve(null); });
    });
  }

  function normalizeGeo(api, j) {
    if (!j) return null;
    try {
      if (api.indexOf('ipwho.is') > -1 && j.success !== false) {
        return {
          ip: j.ip, city: j.city, region: j.region, country: j.country,
          countryCode: j.country_code, postal: j.postal,
          lat: j.latitude, lon: j.longitude,
          continent: j.continent, capital: j.capital,
          timezone: (j.timezone && j.timezone.id) || null,
          isp: (j.connection && j.connection.isp) || j.connection && j.connection.org,
          org: (j.connection && j.connection.org) || null,
          asn: (j.connection && j.connection.asn) || null,
          domain: (j.connection && j.connection.domain) || null,
          type: (j.connection && j.connection.type) || null,
          proxy: !!(j.security && j.security.proxy),
          vpn: !!(j.security && j.security.vpn),
          tor: !!(j.security && j.security.tor),
          hosting: !!(j.security && j.security.hosting),
          source: 'ipwho.is'
        };
      }
      if (api.indexOf('ipapi.co') > -1) {
        return {
          ip: j.ip, city: j.city, region: j.region, country: j.country_name,
          countryCode: j.country_code, postal: j.postal,
          lat: j.latitude, lon: j.longitude,
          timezone: j.timezone, isp: j.org, org: j.org, asn: j.asn,
          type: j.type, source: 'ipapi.co'
        };
      }
      if (api.indexOf('ip-api.com') > -1 && j.status === 'success') {
        return {
          ip: j.query, city: j.city, region: j.regionName, country: j.country,
          countryCode: j.countryCode, lat: j.lat, lon: j.lon,
          timezone: j.timezone, isp: j.isp, org: j.org, asn: j.as,
          proxy: !!j.proxy, hosting: !!j.hosting, mobile: !!j.mobile,
          source: 'ip-api.com'
        };
      }
    } catch (e) {}
    return null;
  }

  function reverseDns(ip) {
    if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip) || CFG.reverseDns === false) return Promise.resolve(null);
    var rev = ip.split('.').reverse().join('.') + '.in-addr.arpa';
    return jget('https://dns.google/resolve?name=' + rev + '&type=PTR').then(function (j) {
      if (j && j.Answer && j.Answer.length) {
        return j.Answer.map(function (a) { return a.data; }).join(', ');
      }
      return null;
    });
  }

  function mapsLink(geo) {
    if (!geo || geo.lat == null || geo.lon == null) return null;
    return 'https://www.google.com/maps?q=' + geo.lat + ',' + geo.lon;
  }

  function reverseIntel() {
    var apis = (CFG.geoApis || []).slice(0, 3);
    var chain = Promise.resolve(null);
    apis.forEach(function (api) {
      chain = chain.then(function (acc) {
        if (acc) return acc;
        return jget(api, 5000).then(function (j) { return normalizeGeo(api, j); });
      });
    });
    return chain.then(function (geo) {
      return reverseDns(geo && geo.ip).then(function (ptr) {
        var out = geo || { ip: null };
        out.ptr = ptr;
        out.maps = mapsLink(geo);
        return out;
      });
    });
  }

  /* =====================================================================
   * 3. DETECTION RULES
   * ===================================================================== */
  var RE = {
    sqli: /(\bunion\b[\s\S]{0,24}\bselect\b)|(\bselect\b[\s\S]{0,24}\bfrom\b)|(\b(and|or)\b\s+\d+\s*=\s*\d+)|(\b(and|or)\b\s+'[^']*'\s*=\s*'[^']*')|('\s*(or|and)\s*')|(\bsleep\s*\()|(\bbenchmark\s*\()|(information_schema)|(\bconcat\s*\()|(waitfor\s+delay)|(\bpg_sleep\b)/i,
    xss: /(<script|<\/script|javascript:|vbscript:|onerror\s*=|onload\s*=|onfocus\s*=|onmouseover\s*=|alert\s*\(|prompt\s*\(|document\.cookie|document\.domain|%3cscript|%3csvg|\u003cscript)/i,
    lfi: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\/etc\/passwd|\/etc\/shadow|\/proc\/self|php:\/\/|file:\/\/|data:text\/html|expect:\/\/|zip:\/\/)/i,
    cmdi: /(?:[;|]|\|\||&&|`|\$\()\s*(cat|ls|whoami|id|uname|curl|wget|nc|bash|sh|powershell|cmd|ping|nslookup)\b/i,
    ssti: /(\{\{[\s\S]{0,40}\}\})|(\$\{[\s\S]{0,40}\})|(<%=)|(\$\{jndi:)/i,
    fileProbe: /(\/\.env|\/\.git|\/\.svn|wp-admin|wp-login|wp-content|xmlrpc\.php|phpmyadmin|pma\/|admin\.php|config\.php|setup\.php|install\.php|\/backup|\/dump|\.sql\b|\.bak\b|\.old\b|\.swp\b|\.DS_Store|composer\.json|composer\.lock|package-lock\.json|\/vendor\/|\/\.aws\/|\/\.ssh\/|\/\.kube\/|\/server-status|\/actuator)/i,
    ssrf: /(169\.254\.169\.254|metadata\.google|metadata\.azure|127\.0\.0\.1|0\.0\.0\.0|localhost|\[::1\]|file:\/\/\/)/i,
    openRedirect: /[?&](url|redirect|next|dest|destination|continue|return|target)=https?:\/\//i,
    crlf: /(%0d%0a|%0a%0d|\r\n|\r|\n|\x00|%00)/i,
    nosql: /\$where|\$ne\b|\$gt\b|\$regex\b|\{\s*"\$[a-z]+"/i,
    traversalEnc: /(%252e%252e|%c0%ae|%uff0e|\.\.%5c|%5c\.\.)/i,
    scannerUA: /(sqlmap|nikto|nmap|masscan|nessus|acunetix|netsparker|burpsuite|burp\b|dirbuster|gobuster|ffuf|wfuzz|hydra|metasploit|zgrab|nuclei|wpscan|joomscan|arachni|owasp|zaproxy|\bzap\b|skipfish|commix|xsstrike|dalfox|tplmap|jexboss|hercules|havij|whatweb|w3af|openvas|qualys|intruder|python-requests|python-urllib|pycurl|libwww-perl|scrapy|go-http-client|okhttp|java\/|curl\/|wget\/|lwp-|masscan|brutus|ncrack|medusa|patator|subfinder|amass|httpx\/|nuclei|nmap|netsparker|proxyman|httrack|wget)/i,
    headless: /(headlesschrome|headless firefox|phantomjs|puppeteer|playwright|electron\/|slimerjs|selenium|htmlunit|jsdom|bot\b|crawler|spider|scraper|curl|wget|python|go-http)/i
  };

  function buildContext() {
    var url = location.href;
    var raw = decodeURIComponent((location.pathname + location.search + location.hash).slice(0, 2000));
    var params = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { params[k] = v; });
    } catch (e) {}
    return {
      url: url,
      path: location.pathname,
      raw: raw,
      params: params,
      referrer: document.referrer || '',
      ua: navigator.userAgent || '',
      fp: null,
      is404: !!window.__GUARD_CTX || /404/.test(document.title || '') && !!window.__GUARD_CTX
    };
  }

  function runRules(ctx) {
    var signals = [];
    var score = 0;

    function hit(id, label, sev, s, evidence) {
      signals.push({ id: id, label: label, severity: sev, score: s, evidence: evidence });
      score += s;
    }

    var targets = [
      { src: 'path', val: decodeURIComponent(ctx.path) },
      { src: 'query', val: ctx.raw },
      { src: 'referrer', val: ctx.referrer },
      { src: 'hash', val: decodeURIComponent(location.hash || '') }
    ];

    var RULES = [
      ['sqli', 'sqli', 'SQL Injection payload', 'critical', 60],
      ['xss', 'xss', 'XSS payload', 'critical', 55],
      ['lfi', 'lfi', 'Path Traversal / LFI', 'critical', 55],
      ['cmdi', 'cmdi', 'Command Injection', 'critical', 60],
      ['ssti', 'ssti', 'SSTI / Log4Shell payload', 'critical', 55],
      ['ssrf', 'ssrf', 'SSRF probe', 'high', 35],
      ['fileProbe', 'recon', 'Sensitive file/panel probing', 'high', 55],
      ['openRedirect', 'openredir', 'Open Redirect probe', 'medium', 20],
      ['crlf', 'crlf', 'CRLF / Header Injection', 'high', 55],
      ['nosql', 'nosql', 'NoSQL Injection', 'high', 35],
      ['traversalEnc', 'traversal', 'Encoded path traversal', 'high', 40]
    ];

    RULES.forEach(function (r) {
      var re = RE[r[0]], id = r[1], label = r[2], sev = r[3], s = r[4];
      for (var i = 0; i < targets.length; i++) {
        var m = targets[i].val.match(re);
        if (m) {
          hit(id, label, sev, s, targets[i].src + ': "' + m[0].slice(0, 120) + '"');
          break;
        }
      }
    });

    if (RE.scannerUA.test(ctx.ua)) {
      hit('scanner-ua', 'Security scanner / attack tool user-agent', 'high', 50, ctx.ua.slice(0, 200));
    } else if (RE.headless.test(ctx.ua)) {
      hit('headless', 'Automated client / headless browser', 'medium', 25, ctx.ua.slice(0, 200));
    }

    if (ctx.fp) {
      if (ctx.fp.webdriver) hit('webdriver', 'navigator.webdriver = true (automation)', 'high', 40, 'webdriver');
      if (ctx.fp.plugins === 0 && ctx.fp.touch === 0) hit('bare-env', 'Bare environment (0 plugins, no touch)', 'low', 10, 'plugins=0');
    }

    if (ctx.is404) hit('404-scan', 'Direct hit to non-existent path (scanning)', 'high', 45, ctx.raw.slice(0, 160));

    // Burst detection
    var now = Date.now();
    var hits = lsGet(LS.hits, []).filter(function (t) { return now - t < CFG.thresholds.burstWindowMs; });
    hits.push(now);
    lsSet(LS.hits, hits.slice(-50));
    if (hits.length >= CFG.thresholds.burst) {
      hit('burst', 'Request burst (' + hits.length + ' in ' + (CFG.thresholds.burstWindowMs / 1000) + 's)', 'high', 55, hits.length + ' hits');
    }

    if (ctx.honeypot) {
      hit('honeypot', 'Honeypot trap triggered: ' + ctx.honeypot, 'critical', 80, ctx.honeypot);
    }

    return { score: score, signals: signals };
  }

  /* =====================================================================
   * 4. ALERT DELIVERY
   * ===================================================================== */
  function cooldownOk(key) {
    var cd = lsGet(LS.cooldown, {});
    var now = Date.now();
    if (cd[key] && now - cd[key] < CFG.alertCooldownMs) return false;
    cd[key] = now;
    var pruned = {};
    Object.keys(cd).forEach(function (k) { if (now - cd[k] < 86400000) pruned[k] = cd[k]; });
    lsSet(LS.cooldown, pruned);
    return true;
  }

  function fmtThaiDate(d) {
    try { return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }); }
    catch (e) { return d.toISOString(); }
  }

  function buildReport(ctx, det, intel) {
    var now = new Date();
    var top = det.signals.slice().sort(function (a, b) { return b.score - a.score; });
    var g = intel || {};
    return {
      ts: now.toISOString(),
      tsLocal: fmtThaiDate(now) + ' WIB',
      site: CFG.site,
      owner: CFG.owner,
      score: det.score,
      severity: det.score >= 90 ? 'CRITICAL' : det.score >= 60 ? 'HIGH' : det.score >= 40 ? 'MEDIUM' : 'LOW',
      verdict: det.score >= 50 ? 'SERANGAN TERDETEKSI' : 'Aktivitas mencurigakan',
      url: ctx.url,
      path: ctx.path,
      query: location.search || '(kosong)',
      referrer: ctx.referrer || '(langsung / kosong)',
      signals: top,
      intel: {
        ip: g.ip || null,
        ptr: g.ptr || null,
        city: g.city, region: g.region, country: g.country, countryCode: g.countryCode,
        postal: g.postal, lat: g.lat, lon: g.lon, maps: g.maps,
        isp: g.isp, org: g.org, asn: g.asn, domain: g.domain, connType: g.type,
        timezone: g.timezone,
        proxy: g.proxy, vpn: g.vpn, tor: g.tor, hosting: g.hosting, mobile: g.mobile,
        source: g.source || null
      },
      client: {
        ua: ctx.ua,
        fp: ctx.fp ? ctx.fp.hash : null,
        screen: ctx.fp ? ctx.fp.screen : null,
        platform: ctx.fp ? ctx.fp.platform : null,
        languages: ctx.fp ? ctx.fp.languages : navigator.language,
        gpu: ctx.fp ? (ctx.fp.webgl.renderer + ' / ' + ctx.fp.webgl.vendor) : null,
        cores: ctx.fp ? ctx.fp.cores : null
      }
    };
  }

  function waText(rep) {
    var i = rep.intel;
    var lines = [];
    lines.push('🚨 SECURITY ALERT — ' + rep.site);
    lines.push('');
    lines.push('Status: ' + rep.severity + ' (' + rep.score + ' poin)');
    lines.push('Waktu: ' + rep.tsLocal);
    lines.push('');
    if (i.ip) {
      lines.push('IP Penyerang: ' + i.ip);
      if (i.ptr) lines.push('Reverse DNS: ' + i.ptr);
      lines.push('Lokasi: ' + [i.city, i.region, i.country].filter(Boolean).join(', '));
      if (i.lat != null) lines.push('Koordinat: ' + i.lat + ', ' + i.lon);
      lines.push('ISP: ' + (i.isp || '-') + (i.asn ? ' (' + i.asn + ')' : ''));
      var fl = [];
      if (i.proxy) fl.push('PROXY');
      if (i.vpn) fl.push('VPN');
      if (i.tor) fl.push('TOR');
      if (i.hosting) fl.push('HOSTING/DC');
      if (fl.length) lines.push('Anonimitas: ' + fl.join(' + '));
      if (i.maps) lines.push('Peta: ' + i.maps);
    } else {
      lines.push('IP: tidak terdeteksi (kemungkinan scanner non-JS / bot)');
    }
    lines.push('');
    lines.push('Jalur: ' + rep.path);
    if (rep.query && rep.query !== '(kosong)') lines.push('Query: ' + rep.query.slice(0, 200));
    lines.push('');
    lines.push('Indikator:');
    rep.signals.slice(0, 6).forEach(function (s) { lines.push('• ' + s.label + ' (+' + s.score + ')'); });
    lines.push('');
    lines.push('UA: ' + String(rep.client.ua).slice(0, 160));
    return lines.join('\n');
  }

  function emailText(rep) {
    var i = rep.intel, c = rep.client;
    var L = [];
    L.push('PERINGATAN KEAMANAN — ' + rep.site);
    L.push('='.repeat(52));
    L.push('Status      : ' + rep.severity + ' (' + rep.score + ' poin)');
    L.push('Waktu       : ' + rep.tsLocal);
    L.push('URL         : ' + rep.url);
    L.push('Referrer    : ' + rep.referrer);
    L.push('');
    L.push('--- INFORMASI PENYERANG ---');
    L.push('IP          : ' + (i.ip || 'tidak terdeteksi'));
    L.push('Reverse DNS : ' + (i.ptr || '-'));
    L.push('Lokasi      : ' + [i.city, i.region, i.country].filter(Boolean).join(', '));
    L.push('Koordinat   : ' + (i.lat != null ? i.lat + ', ' + i.lon : '-'));
    L.push('Peta        : ' + (i.maps || '-'));
    L.push('ISP/Org     : ' + (i.isp || '-') + (i.org && i.org !== i.isp ? ' / ' + i.org : ''));
    L.push('ASN         : ' + (i.asn || '-'));
    L.push('Tipe Koneksi: ' + (i.connType || '-'));
    L.push('Timezone    : ' + (i.timezone || '-'));
    L.push('Proxy/VPN/TOR/Hosting: ' + [i.proxy ? 'Proxy' : '', i.vpn ? 'VPN' : '', i.tor ? 'TOR' : '', i.hosting ? 'Hosting' : ''].filter(Boolean).join(', ') || 'tidak ada');
    L.push('');
    L.push('--- INDIKATOR SERANGAN ---');
    rep.signals.forEach(function (s) {
      L.push('[' + s.severity.toUpperCase() + ' +' + s.score + '] ' + s.label);
      if (s.evidence) L.push('    bukti: ' + s.evidence);
    });
    L.push('');
    L.push('--- CLIENT ---');
    L.push('UA       : ' + c.ua);
    L.push('Fingerprint: ' + c.fp);
    L.push('Layar    : ' + c.screen + ' | Platform: ' + c.platform + ' | Core: ' + c.cores);
    L.push('Bahasa   : ' + c.languages);
    L.push('GPU      : ' + c.gpu);
    L.push('');
    L.push('---');
    L.push('Halaman web kamu berhasil mempertahankan diri. Tidak ada tindakan yang perlu dilakukan,');
    L.push('kecuali indikator di atas muncul berulang dari IP yang sama.');
    return L.join('\n');
  }

  function sendRelay(rep, kind, payloadText) {
    if (!CFG.relayUrl) return Promise.resolve(false);
    var body = {
      kind: kind,
      site: CFG.site,
      report: rep,
      email: { to: CFG.alertEmail, subject: '🚨 SECURITY ALERT — ' + rep.site + ' — ' + rep.severity, text: emailText(rep) },
      whatsapp: { to: CFG.alertWhatsApp, text: waText(rep) }
    };
    return fetch(CFG.relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Guard-Secret': CFG.relaySecret || '' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function sendEmailJS(rep) {
    var e = CFG.emailjs || {};
    if (!e.enabled || !e.publicKey) return Promise.resolve(false);
    return new Promise(function (resolve) {
      function go() {
        // init WAJIB dipanggil sebelum send, apa pun jalur yang dipakai.
        try { window.emailjs.init({ publicKey: e.publicKey }); } catch (initErr) {}
        try {
          window.emailjs.send(e.serviceId, e.templateId, {
            to_email: CFG.alertEmail,
            site: rep.site,
            severity: rep.severity,
            score: rep.score,
            time: rep.tsLocal,
            subject: '🚨 SECURITY ALERT — ' + rep.site,
            message: emailText(rep),
            ip: rep.intel.ip || 'tidak terdeteksi',
            location: [rep.intel.city, rep.intel.region, rep.intel.country].filter(Boolean).join(', '),
            isp: rep.intel.isp || '-',
            maps: rep.intel.maps || '-',
            url: rep.url,
            user_agent: rep.client.ua
          }).then(function () { resolve(true); }).catch(function () { resolve(false); });
        } catch (err) { resolve(false); }
      }
      if (window.emailjs && window.emailjs.send) return go();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = go;
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  function sendCallMeBot(rep) {
    var c = CFG.callmebot || {};
    if (!c.enabled || !c.apiKey) return Promise.resolve(false);
    var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent('+' + CFG.alertWhatsApp) +
      '&text=' + encodeURIComponent(waText(rep)) + '&apikey=' + encodeURIComponent(c.apiKey);
    return new Promise(function (resolve) {
      fetch(url, { mode: 'no-cors' }).then(function () { resolve(true); }).catch(function () { resolve(false); });
    });
  }

  function deliver(rep) {
    var key = (rep.signals[0] && rep.signals[0].id) + '|' + (rep.intel.ip || rep.client.fp);
    if (!cooldownOk(key)) { dbg('cooldown, alert ditahan'); return Promise.resolve({ sent: false, reason: 'cooldown' }); }

    var rec = lsGet(LS.log, []);
    rec.unshift({ ts: rep.ts, tsLocal: rep.tsLocal, score: rep.score, severity: rep.severity, ip: rep.intel.ip, path: rep.path, top: (rep.signals[0] || {}).label });
    lsSet(LS.log, rec.slice(0, 50));

    return Promise.all([
      sendRelay(rep).then(function (ok) { return ok ? 'relay' : null; }),
      sendEmailJS(rep).then(function (ok) { return ok ? 'emailjs' : null; }),
      sendCallMeBot(rep).then(function (ok) { return ok ? 'callmebot' : null; })
    ]).then(function (chans) {
      var ok = chans.filter(Boolean);
      dbg('alert terkirim via:', ok.length ? ok.join(', ') : '(tidak ada kanal aktif)');
      return { sent: ok.length > 0, channels: ok };
    });
  }

  /* =====================================================================
   * 5. COUNTERMEASURES — "putar balikan"
   * ===================================================================== */
  function tarpit(ms) {
    if (!CFG.countermeasures.tarpit) return;
    dbg('tarpit aktif selama', ms, 'ms');
    var end = Date.now() + ms;
    var loops = CFG.countermeasures.tarpitIntensity;
    (function spin() {
      if (Date.now() > end) return;
      var x = 1e-9;
      for (var i = 0; i < loops; i++) { x = Math.sqrt(x + i % 13) * 1.0000001; }
      requestAnimationFrame(spin);
    })();
  }

  function deployDecoy(rep) {
    if (!CFG.countermeasures.decoy) return;
    try {
      var WIRE = {
        relay: CFG.relayUrl || '',
        secret: CFG.relaySecret || '',
        site: CFG.site,
        report: rep
      };

      document.documentElement.innerHTML =
        '<head><title>Admin Panel — Login</title><style>' +
        'body{margin:0;font-family:system-ui,Segoe UI,Arial;background:#0f1115;color:#e6e6e6;display:flex;align-items:center;justify-content:center;height:100vh}' +
        '.box{background:#171a21;padding:36px 40px;border:1px solid #262b36;border-radius:12px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.6)}' +
        'h1{font-size:18px;margin:0 0 4px}p{font-size:12px;color:#7d8798;margin:0 0 20px}' +
        'input{width:100%;box-sizing:border-box;padding:11px;margin-bottom:12px;background:#0f1115;border:1px solid #2c3340;color:#eee;border-radius:6px;font-size:14px}' +
        'button{width:100%;padding:12px;background:#3b82f6;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer}' +
        '.err{color:#ff6b6b;font-size:12px;margin-top:10px}</style></head>' +
        '<body><div class="box"><h1>Administrator Login</h1><p>Restricted area — authorized personnel only.</p>' +
        '<form id="dp"><input id="u" placeholder="Username" autocomplete="off"><input id="p" type="password" placeholder="Password" autocomplete="off">' +
        '<button type="submit">Sign in</button><div class="err" id="e"></div></form></div>' +
        '<script type="application/json" id="guard-wire">' + JSON.stringify(WIRE).replace(/</g, '\\u003c') + '<\/script>' +
        '<script>(function(){var w=JSON.parse(document.getElementById("guard-wire").textContent);' +
        'var f=document.getElementById("dp");if(!f)return;f.addEventListener("submit",function(ev){ev.preventDefault();' +
        'var u=document.getElementById("u").value,p=document.getElementById("p").value;' +
        'document.getElementById("e").textContent="Invalid credentials. Attempt logged.";' +
        'try{fetch(w.relay,{method:"POST",headers:{"Content-Type":"application/json","X-Guard-Secret":w.secret},' +
        'body:JSON.stringify({kind:"decoy-credential",site:w.site,decoy:{username:u,password:p},report:w.report})});}catch(x){}' +
        'f.reset();});})();<\/script></body>';
      dbg('decoy login dipasang');
    } catch (e) { dbg('decoy gagal', e); }
  }

  function runCountermeasures(rep) {
    if (!CFG.countermeasures.enabled) return;
    var hard = rep.score >= CFG.thresholds.critical ||
      rep.signals.some(function (s) { return s.id === 'scanner-ua' || s.id === 'honeypot'; });
    if (!hard) return;
    tarpit(CFG.countermeasures.tarpitDurationMs);
    deployDecoy(rep);
  }

  /* =====================================================================
   * 6. HONEYPOTS
   * ===================================================================== */
  function installHoneypots() {
    if (!CFG.honeypots.enabled || !CFG.honeypots.paths.length) return;
    function trap(path) {
      var a = document.createElement('a');
      a.href = path;
      a.className = 'guard-trap';
      a.textContent = '';
      a.setAttribute('aria-hidden', 'true');
      a.setAttribute('tabindex', '-1');
      a.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:auto;';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        fire({ honeypot: 'link:' + path });
      });
      document.body.appendChild(a);
    }
    CFG.honeypots.paths.forEach(trap);

    var field = document.createElement('input');
    field.type = 'text';
    field.name = 'email_confirm_hp';
    field.id = 'guard-hp-field';
    field.autocomplete = 'off';
    field.setAttribute('aria-hidden', 'true');
    field.style.cssText = 'position:absolute;left:-9999px;opacity:0;width:1px;height:1px;';
    field.addEventListener('input', function () {
      if (field.value.length > 2) fire({ honeypot: 'form-field-auto-fill' });
    });
    document.body.appendChild(field);
  }

  /* =====================================================================
   * 7. MAIN FLOW
   * ===================================================================== */
  var running = {};

  function fire(extra) {
    extra = extra || {};
    var ctx = buildContext();
    if (extra.honeypot) ctx.honeypot = extra.honeypot;
    if (window.__GUARD_CTX && window.__GUARD_CTX.requestedPath) {
      ctx.is404 = true;
      ctx.raw = decodeURIComponent(window.__GUARD_CTX.requestedPath).slice(0, 2000);
      ctx.path = window.__GUARD_CTX.requestedPath.split('?')[0];
    }
    ctx.fp = buildFingerprint();

    var det = runRules(ctx);
    dbg('skor deteksi:', det.score, det.signals);

    if (det.score < CFG.thresholds.score && !CFG.reportHumanTraffic) return Promise.resolve(null);

    var chainKey = det.signals.map(function (s) { return s.id; }).join(',');
    if (running[chainKey]) return running[chainKey];

    running[chainKey] = reverseIntel().then(function (intel) {
      var rep = buildReport(ctx, det, intel);
      return deliver(rep).then(function (res) {
        runCountermeasures(rep);
        window.__GUARD_LAST_REPORT = rep;
        return rep;
      });
    });
    return running[chainKey];
  }

  function boot() {
    try { installHoneypots(); } catch (e) {}
    if (CFG.reportOnLoad !== false) setTimeout(function () { fire(); }, 400);

    // Expose minimal API
    window.WSGuard = {
      scan: fire,
      intel: reverseIntel,
      report: function () { return window.__GUARD_LAST_REPORT || null; },
      log: function () { return lsGet(LS.log, []); },
      version: '1.0.0'
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
