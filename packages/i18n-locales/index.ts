// Single source of truth for Eawlma UI translations. Both apps/frontend and
// apps/mobile import from here. To add a new locale: drop the JSON in
// ./locales/ and add an entry below — that's it.

import af from './locales/af.json';
import am from './locales/am.json';
import ar from './locales/ar.json';
import bn from './locales/bn.json';
import da from './locales/da.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fa from './locales/fa.json';
import fi from './locales/fi.json';
import fr from './locales/fr.json';
import gu from './locales/gu.json';
import he from './locales/he.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import mr from './locales/mr.json';
import ms from './locales/ms.json';
import ne from './locales/ne.json';
import nl from './locales/nl.json';
import no from './locales/no.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import si from './locales/si.json';
import sv from './locales/sv.json';
import sw from './locales/sw.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import th from './locales/th.json';
import tl from './locales/tl.json';
import tr from './locales/tr.json';
import ur from './locales/ur.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';

export const LOCALES = {
  af, am, ar, bn, da, de, en, es, fa, fi, fr, gu, he, hi, id, it, ja, ko,
  mr, ms, ne, nl, no, pl, pt, ro, ru, si, sv, sw, ta, te, th, tl, tr, ur, vi, zh,
} as const;

export type LocaleCode = keyof typeof LOCALES;

// Convenience: i18next resources shape so consumers can do
//   i18n.init({ resources: toI18nextResources() })
// without rewriting the map themselves. We type the per-locale translations
// as `Record<string, unknown>` because i18next's own `ResourceKey` is opaque
// to TypeScript, and a structural shape lets us pass the typed JSON imports
// through without a runtime transform.
export type ResourceMap = Record<string, { translation: Record<string, unknown> }>;

export function toI18nextResources(): ResourceMap {
  const map: ResourceMap = {};
  for (const code of Object.keys(LOCALES) as LocaleCode[]) {
    map[code] = { translation: LOCALES[code] as unknown as Record<string, unknown> };
  }
  return map;
}

export const LOCALE_CODES = Object.keys(LOCALES) as LocaleCode[];

// Named exports so callers can pick individual locales if they prefer.
export {
  af, am, ar, bn, da, de, en, es, fa, fi, fr, gu, he, hi, id, it, ja, ko,
  mr, ms, ne, nl, no, pl, pt, ro, ru, si, sv, sw, ta, te, th, tl, tr, ur, vi, zh,
};
