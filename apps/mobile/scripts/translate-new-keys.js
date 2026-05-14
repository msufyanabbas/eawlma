// Fills missing keys in every locale file by translating from en.json
// using the FREE Google Translate endpoint (no API key required).
//
// Usage: node scripts/translate-new-keys.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');

// Language code map: filename -> Google Translate target code
const LANG_CODES = {
  ur: 'ur', fr: 'fr', zh: 'zh-CN', hi: 'hi', es: 'es', de: 'de',
  tr: 'tr', ru: 'ru', id: 'id', ms: 'ms', bn: 'bn', tl: 'tl',
  vi: 'vi', th: 'th', ko: 'ko', ja: 'ja', fa: 'fa', he: 'he',
  sw: 'sw', am: 'am', ne: 'ne', si: 'si', ta: 'ta', te: 'te',
  gu: 'gu', mr: 'mr', pt: 'pt', it: 'it', nl: 'nl', pl: 'pl',
  ro: 'ro', sv: 'sv', da: 'da', fi: 'fi', no: 'no', af: 'af',
  ar: 'ar',
};

const SPLIT_TOKEN = '|||SPLIT|||';
const BATCH_SIZE = 25; // strings per HTTP call
const REQUEST_DELAY_MS = 350;

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function gtRequest(text, target) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=' +
    encodeURIComponent(target) +
    '&q=' +
    encodeURIComponent(text);
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const chunks = (parsed[0] || [])
              .map((seg) => (Array.isArray(seg) ? seg[0] : ''))
              .join('');
            resolve(chunks);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function translateBatch(texts, target) {
  if (!texts.length) return [];
  const joined = texts.join(` ${SPLIT_TOKEN} `);
  const raw = await gtRequest(joined, target);
  const parts = raw.split(SPLIT_TOKEN).map((s) => s.trim());
  if (parts.length !== texts.length) {
    // fall back to one-by-one
    const out = [];
    for (const t of texts) {
      await sleep(REQUEST_DELAY_MS);
      try {
        out.push(await gtRequest(t, target));
      } catch {
        out.push(t);
      }
    }
    return out;
  }
  return parts;
}

async function processLocale(langCode, enFlat) {
  const filePath = path.join(LOCALES_DIR, `${langCode}.json`);
  if (!fs.existsSync(filePath)) return;
  const target = LANG_CODES[langCode];
  if (!target) {
    console.log(`Skip ${langCode}: no GT code mapping`);
    return;
  }
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const currentFlat = flatten(current);

  const missing = [];
  for (const key of Object.keys(enFlat)) {
    const v = currentFlat[key];
    if (v === undefined || v === null || v === '' || v === enFlat[key]) {
      // treat identical-to-English as untranslated for non-English locales
      if (langCode === 'en') continue;
      missing.push(key);
    }
  }
  if (!missing.length) {
    console.log(`${langCode}: already complete`);
    return;
  }
  console.log(`${langCode}: translating ${missing.length} keys...`);

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const slice = missing.slice(i, i + BATCH_SIZE);
    const texts = slice.map((k) => String(enFlat[k] ?? ''));
    let translated;
    try {
      translated = await translateBatch(texts, target);
    } catch (e) {
      console.error(`  batch failed (${langCode}): ${e.message} — keeping English fallback`);
      translated = texts;
    }
    for (let j = 0; j < slice.length; j++) {
      setDeep(current, slice[j], translated[j] || texts[j]);
    }
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + '\n');
    process.stdout.write(`  ${langCode}: ${Math.min(i + BATCH_SIZE, missing.length)}/${missing.length}\r`);
    await sleep(REQUEST_DELAY_MS);
  }
  console.log(`\n${langCode}: done`);
}

(async () => {
  if (!fs.existsSync(EN_PATH)) {
    console.error('en.json missing');
    process.exit(1);
  }
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const enFlat = flatten(en);
  console.log(`English source keys: ${Object.keys(enFlat).length}`);

  const targets = Object.keys(LANG_CODES).filter((c) => c !== 'en');
  for (const code of targets) {
    try {
      await processLocale(code, enFlat);
    } catch (e) {
      console.error(`${code} failed: ${e.message}`);
    }
  }
  console.log('All locales processed.');
})();
