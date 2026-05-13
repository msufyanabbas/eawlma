import { useTranslation } from 'react-i18next';

export function useRTL() {
  const { i18n } = useTranslation();
  const isRTL = ['ar', 'ur', 'fa', 'he'].includes(i18n.language);

  return {
    isRTL,
    isAr: i18n.language === 'ar',
    lang: i18n.language,
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    flexDir: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    backIcon: (isRTL ? 'arrow-forward' : 'arrow-back') as
      | 'arrow-forward'
      | 'arrow-back',
  };
}
