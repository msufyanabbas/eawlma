import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';

const supported = (import.meta.env.VITE_SUPPORTED_LOCALES ?? 'ar,en')
  .split(',')
  .map((s) => s.trim());

const fallback = import.meta.env.VITE_DEFAULT_LOCALE ?? 'ar';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: undefined, // let detector pick
    fallbackLng: fallback,
    supportedLngs: supported,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'aqarat.locale',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
