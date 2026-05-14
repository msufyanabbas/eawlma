/* eslint-disable no-console */
// Find translation keys present in en.json but missing from other locale files
// and fill them in by asking Claude (Haiku 4.5) for translations. Idempotent —
// re-runs only touch the keys still missing. Requires ANTHROPIC_API_KEY in env.
//
// Usage (from apps/mobile/):
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-missing.js
//
// The "(English -> ?)" prompt keeps {{interpolation}} placeholders, brand names
// (Eawlma, SAR, Nafath) and locale codes intact.

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCALES_DIR = path.resolve(__dirname, '..', 'src', 'i18n', 'locales');
const SOURCE = 'en';
const MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const LANG_NAMES = {
  af: 'Afrikaans',  am: 'Amharic',    ar: 'Arabic',     bn: 'Bengali',
  da: 'Danish',     de: 'German',     es: 'Spanish',    fa: 'Persian',
  fi: 'Finnish',    fr: 'French',     gu: 'Gujarati',   he: 'Hebrew',
  hi: 'Hindi',      id: 'Indonesian', it: 'Italian',    ja: 'Japanese',
  ko: 'Korean',     mr: 'Marathi',    ms: 'Malay',      ne: 'Nepali',
  nl: 'Dutch',      no: 'Norwegian',  pl: 'Polish',     pt: 'Portuguese',
  ro: 'Romanian',   ru: 'Russian',    si: 'Sinhala',    sv: 'Swedish',
  sw: 'Swahili',    ta: 'Tamil',      te: 'Telugu',     th: 'Thai',
  tl: 'Filipino',   tr: 'Turkish',    ur: 'Urdu',       vi: 'Vietnamese',
  zh: 'Chinese (Simplified)',
};

if (!ANTHROPIC_KEY) {
  console.error('Set ANTHROPIC_API_KEY before running this script.');
  process.exit(1);
}

const source = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, `${SOURCE}.json`), 'utf8'),
);

const locales = fs.readdirSync(LOCALES_DIR)
  .filter(f => f.endsWith('.json') && f !== `${SOURCE}.json`)
  .map(f => f.replace('.json', ''));

function findMissing(src, tgt) {
  const out = {};
  for (const key of Object.keys(src)) {
    const sv = src[key];
    const tv = tgt ? tgt[key] : undefined;
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      const sub = findMissing(sv, (tv && typeof tv === 'object') ? tv : {});
      if (Object.keys(sub).length > 0) out[key] = sub;
    } else if (tv === undefined || tv === null || tv === '') {
      out[key] = sv;
    }
  }
  return out;
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)
        && out[key] && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key], sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message || raw));
          resolve(parsed.content?.[0]?.text || '');
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function translate(locale, missing) {
  const langName = LANG_NAMES[locale] || locale;
  const prompt = `Translate every string VALUE in the following JSON to ${langName}.
Keep keys exactly as-is. Translate only values.
Preserve any {{double-brace}} interpolation placeholders.
Keep these brand / proper nouns unchanged: Eawlma, SAR, Nafath, Authentica, WhatsApp.
Reply with ONLY the translated JSON object — no commentary, no markdown fences.

${JSON.stringify(missing, null, 2)}`;

  const raw = await callClaude(prompt);
  const cleaned = raw.replace(/^```json\s*|\s*```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}

(async () => {
  console.log(`Reading source: ${SOURCE}.json (${Object.keys(source).length} top-level keys)`);
  for (const locale of locales) {
    const localePath = path.join(LOCALES_DIR, `${locale}.json`);
    const target = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const missing = findMissing(source, target);
    const missingCount = JSON.stringify(missing).length;
    if (missingCount < 5) {
      console.log(`  ${locale}: up-to-date`);
      continue;
    }
    process.stdout.write(`  ${locale}: translating ~${missingCount} bytes... `);
    try {
      const translated = await translate(locale, missing);
      const merged = deepMerge(target, translated);
      fs.writeFileSync(localePath, JSON.stringify(merged, null, 2) + '\n');
      console.log('done');
    } catch (e) {
      console.log(`failed (${e.message})`);
    }
    // Soft rate limit so we don't trip the Anthropic per-minute cap.
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('All locales processed.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
