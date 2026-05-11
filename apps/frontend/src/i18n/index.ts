import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';

const supported = (import.meta.env.VITE_SUPPORTED_LOCALES ?? 'ar,en,ur')
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
