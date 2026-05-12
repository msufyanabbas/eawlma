// i18next bootstrap for the mobile app. Pulls all 38 locales from the shared
// workspace package so web and mobile stay in sync. The active language is
// driven by the Zustand UI store, which itself persists to AsyncStorage on
// every change — so language selection survives app restarts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { LOCALE_CODES, toI18nextResources, type LocaleCode } from '@eawlma/i18n-locales';

const STORAGE_KEY = 'eawlma.locale';
const SUPPORTED = new Set<string>(LOCALE_CODES);

function detectInitialLanguage(): LocaleCode {
  // Prefer the device's primary preferred language if we ship a UI for it.
  // expo-localization is only available at runtime; guard for tests/SSR.
  try {
    const device = Localization.getLocales?.()[0]?.languageCode ?? 'ar';
    if (device && SUPPORTED.has(device)) return device as LocaleCode;
  } catch {
    // ignore
  }
  return 'ar';
}

export async function bootstrapI18n(initialLanguage?: string): Promise<void> {
  let lang = initialLanguage;
  if (!lang) {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      lang = stored ?? detectInitialLanguage();
    } catch {
      lang = detectInitialLanguage();
    }
  }
  await i18n.use(initReactI18next).init({
    resources: toI18nextResources(),
    lng: SUPPORTED.has(lang) ? lang : 'ar',
    fallbackLng: 'ar',
    supportedLngs: Array.from(SUPPORTED),
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

export async function changeLanguage(code: string): Promise<void> {
  if (!SUPPORTED.has(code)) return;
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // non-fatal
  }
}

export { i18n };
export default i18n;
