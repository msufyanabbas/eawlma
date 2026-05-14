import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Locale JSONs live next to this file (copied from @eawlma/i18n-locales).
// Keeping them local sidesteps any workspace-symlink edge cases when Metro
// bundles for production / EAS builds.
import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import de from './locales/de.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import bn from './locales/bn.json';
import tl from './locales/tl.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import fa from './locales/fa.json';
import he from './locales/he.json';
import sw from './locales/sw.json';
import am from './locales/am.json';
import ne from './locales/ne.json';
import si from './locales/si.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import no from './locales/no.json';
import af from './locales/af.json';

export const RTL_LANGUAGES = ['ar', 'ur', 'fa', 'he'];
const LANGUAGE_KEY = 'eawlma.locale';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  ur: { translation: ur },
  fr: { translation: fr },
  zh: { translation: zh },
  hi: { translation: hi },
  es: { translation: es },
  de: { translation: de },
  tr: { translation: tr },
  ru: { translation: ru },
  id: { translation: id },
  ms: { translation: ms },
  bn: { translation: bn },
  tl: { translation: tl },
  vi: { translation: vi },
  th: { translation: th },
  ko: { translation: ko },
  ja: { translation: ja },
  fa: { translation: fa },
  he: { translation: he },
  sw: { translation: sw },
  am: { translation: am },
  ne: { translation: ne },
  si: { translation: si },
  ta: { translation: ta },
  te: { translation: te },
  gu: { translation: gu },
  mr: { translation: mr },
  pt: { translation: pt },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl },
  ro: { translation: ro },
  sv: { translation: sv },
  da: { translation: da },
  fi: { translation: fi },
  no: { translation: no },
  af: { translation: af },
};

export const SUPPORTED_LOCALES = Object.keys(resources);

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  const lang = stored && SUPPORTED_LOCALES.includes(stored) ? stored : 'ar';
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(RTL_LANGUAGES.includes(lang));

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: lang,
      // Fall back to English (not Arabic) when a key is missing in the
      // active locale — useful for the 35 non-RTL locales because a missing
      // French key shouldn't render as Arabic text. The Arabic-only audience
      // will still see Arabic when ar is the active locale.
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
      // Surface missing keys during development so the next wave of refactors
      // is easier — silent in production builds.
      saveMissing: __DEV__,
      missingKeyHandler: __DEV__
        ? (lngs, _ns, key) => {
            // eslint-disable-next-line no-console
            console.warn(`[i18n] missing key "${key}" for locale ${lngs?.[0] ?? '?'}`);
          }
        : undefined,
    });
  }
}

export async function changeLanguage(lang: string): Promise<void> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[i18n] changeLanguage from "${i18n.language}" to "${lang}"`);
  }
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[i18n] active="${i18n.language}", nav.home="${i18n.t('nav.home')}"`);
  }
  I18nManager.forceRTL(RTL_LANGUAGES.includes(lang));
}

export default i18n;
