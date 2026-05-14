// Deep-merges packages/i18n-locales/locales/<lang>.json into
// apps/mobile/src/i18n/locales/<lang>.json. Mobile keys win on conflicts.
const fs = require('fs');
const path = require('path');

const SHARED_DIR = path.resolve(__dirname, '../../../packages/i18n-locales/locales');
const MOBILE_DIR = path.resolve(__dirname, '../src/i18n/locales');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
}

const files = fs.readdirSync(SHARED_DIR).filter((f) => f.endsWith('.json'));
for (const file of files) {
  const sharedPath = path.join(SHARED_DIR, file);
  const mobilePath = path.join(MOBILE_DIR, file);
  const shared = JSON.parse(fs.readFileSync(sharedPath, 'utf8'));
  let mobile = {};
  if (fs.existsSync(mobilePath)) {
    try {
      mobile = JSON.parse(fs.readFileSync(mobilePath, 'utf8'));
    } catch {
      mobile = {};
    }
  }
  // mobile wins: start from a copy of shared, then merge mobile on top
  const merged = deepMerge(JSON.parse(JSON.stringify(shared)), mobile);
  fs.writeFileSync(mobilePath, JSON.stringify(merged, null, 2) + '\n');
  console.log('Synced:', file);
}
console.log('Done! All shared keys merged into mobile locales (mobile wins on conflicts).');
