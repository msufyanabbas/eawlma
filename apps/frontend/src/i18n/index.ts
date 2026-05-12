import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import no from './locales/no.json';
import af from './locales/af.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import tl from './locales/tl.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import sw from './locales/sw.json';
import am from './locales/am.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ne from './locales/ne.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import si from './locales/si.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import fa from './locales/fa.json';
import he from './locales/he.json';

const ALL_LOCALES = [
  'ar', 'en', 'ur',
  'fr', 'es', 'de', 'it', 'pt', 'nl', 'tr', 'ru',
  'pl', 'ro', 'sv', 'da', 'fi', 'no', 'af',
  'id', 'ms', 'tl', 'vi', 'th', 'sw', 'am',
  'hi', 'bn', 'ne', 'ta', 'te', 'gu', 'mr', 'si',
  'zh', 'ko', 'ja', 'fa', 'he',
];

const supported = (import.meta.env.VITE_SUPPORTED_LOCALES ?? ALL_LOCALES.join(','))
  .split(',')
  .map((s) => s.trim());

// Arabic is the canonical default for Eawlma — first-time visitors land in
// Arabic unless the language detector finds a saved preference in
// localStorage or a matching browser language.
const fallback = import.meta.env.VITE_DEFAULT_LOCALE ?? 'ar';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      ur: { translation: ur },
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
      it: { translation: it },
      pt: { translation: pt },
      nl: { translation: nl },
      tr: { translation: tr },
      ru: { translation: ru },
      pl: { translation: pl },
      ro: { translation: ro },
      sv: { translation: sv },
      da: { translation: da },
      fi: { translation: fi },
      no: { translation: no },
      af: { translation: af },
      id: { translation: id },
      ms: { translation: ms },
      tl: { translation: tl },
      vi: { translation: vi },
      th: { translation: th },
      sw: { translation: sw },
      am: { translation: am },
      hi: { translation: hi },
      bn: { translation: bn },
      ne: { translation: ne },
      ta: { translation: ta },
      te: { translation: te },
      gu: { translation: gu },
      mr: { translation: mr },
      si: { translation: si },
      zh: { translation: zh },
      ko: { translation: ko },
      ja: { translation: ja },
      fa: { translation: fa },
      he: { translation: he },
    },
    // Initial language: prefer the detector (localStorage > navigator), but
    // fall back to Arabic if nothing matches.
    lng: undefined,
    fallbackLng: fallback,
    supportedLngs: supported,
    interpolation: { escapeValue: false },
    detection: {
      // Drop `htmlTag` — it would always resolve to Arabic now (since the
      // initial document.documentElement.lang is set by the previous session
      // or our default), masking real navigator preferences for first-time
      // visitors.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'eawlma.locale',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
