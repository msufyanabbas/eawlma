import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { toI18nextResources, LOCALE_CODES } from '@eawlma/i18n-locales';

export const RTL_LANGUAGES = ['ar', 'ur', 'fa', 'he'];
const LANGUAGE_KEY = 'eawlma.locale';

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  const lang = stored && LOCALE_CODES.includes(stored as any) ? stored : 'ar';
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(RTL_LANGUAGES.includes(lang));

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: toI18nextResources(),
      lng: lang,
      fallbackLng: 'ar',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
  }
}

export async function changeLanguage(lang: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  I18nManager.forceRTL(RTL_LANGUAGES.includes(lang));
}

export default i18n;
