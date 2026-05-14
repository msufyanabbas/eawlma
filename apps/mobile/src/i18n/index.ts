import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Direct JSON imports — the most reliable shape for Metro / TypeScript +
// resolveJsonModule. Avoids any indirection through helper functions in the
// shared package, which lets Metro tree-shake whatever isn't referenced.
import ar from '@eawlma/i18n-locales/locales/ar.json';
import en from '@eawlma/i18n-locales/locales/en.json';
import ur from '@eawlma/i18n-locales/locales/ur.json';
import fr from '@eawlma/i18n-locales/locales/fr.json';
import zh from '@eawlma/i18n-locales/locales/zh.json';
import hi from '@eawlma/i18n-locales/locales/hi.json';
import es from '@eawlma/i18n-locales/locales/es.json';
import de from '@eawlma/i18n-locales/locales/de.json';
import tr from '@eawlma/i18n-locales/locales/tr.json';
import ru from '@eawlma/i18n-locales/locales/ru.json';
import id from '@eawlma/i18n-locales/locales/id.json';
import ms from '@eawlma/i18n-locales/locales/ms.json';
import bn from '@eawlma/i18n-locales/locales/bn.json';
import tl from '@eawlma/i18n-locales/locales/tl.json';
import vi from '@eawlma/i18n-locales/locales/vi.json';
import th from '@eawlma/i18n-locales/locales/th.json';
import ko from '@eawlma/i18n-locales/locales/ko.json';
import ja from '@eawlma/i18n-locales/locales/ja.json';
import fa from '@eawlma/i18n-locales/locales/fa.json';
import he from '@eawlma/i18n-locales/locales/he.json';
import sw from '@eawlma/i18n-locales/locales/sw.json';
import am from '@eawlma/i18n-locales/locales/am.json';
import ne from '@eawlma/i18n-locales/locales/ne.json';
import si from '@eawlma/i18n-locales/locales/si.json';
import ta from '@eawlma/i18n-locales/locales/ta.json';
import te from '@eawlma/i18n-locales/locales/te.json';
import gu from '@eawlma/i18n-locales/locales/gu.json';
import mr from '@eawlma/i18n-locales/locales/mr.json';
import pt from '@eawlma/i18n-locales/locales/pt.json';
import it from '@eawlma/i18n-locales/locales/it.json';
import nl from '@eawlma/i18n-locales/locales/nl.json';
import pl from '@eawlma/i18n-locales/locales/pl.json';
import ro from '@eawlma/i18n-locales/locales/ro.json';
import sv from '@eawlma/i18n-locales/locales/sv.json';
import da from '@eawlma/i18n-locales/locales/da.json';
import fi from '@eawlma/i18n-locales/locales/fi.json';
import no from '@eawlma/i18n-locales/locales/no.json';
import af from '@eawlma/i18n-locales/locales/af.json';

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
