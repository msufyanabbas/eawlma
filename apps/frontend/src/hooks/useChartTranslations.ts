import { useTranslation } from 'react-i18next';

import { formatNumber } from '../utils/formatters';

/** Languages whose dashboard charts should read right-to-left. */
const RTL_LANGS = ['ar', 'ur', 'fa', 'he'];

/**
 * Helpers for rendering Recharts charts with translated labels and RTL-aware
 * ordering. Recharts itself stays LTR (see `RTLChart`); this hook only
 * localizes the text and, for RTL languages, reverses the data array so the
 * series reads right-to-left.
 *
 * Note: i18next returns the key itself for a missing translation, so every
 * lookup here passes an explicit `defaultValue` — `t(key) || fallback` would
 * never reach the fallback.
 */
export function useChartTranslations() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGS.includes(i18n.language);

  // Both 3-letter and full English month names map to the localized short
  // month, so it works regardless of which form the API/data uses.
  const monthNames: Record<string, string> = {
    Jan: t('months.jan'), January: t('months.jan'),
    Feb: t('months.feb'), February: t('months.feb'),
    Mar: t('months.mar'), March: t('months.mar'),
    Apr: t('months.apr'), April: t('months.apr'),
    May: t('months.may'),
    Jun: t('months.jun'), June: t('months.jun'),
    Jul: t('months.jul'), July: t('months.jul'),
    Aug: t('months.aug'), August: t('months.aug'),
    Sep: t('months.sep'), September: t('months.sep'),
    Oct: t('months.oct'), October: t('months.oct'),
    Nov: t('months.nov'), November: t('months.nov'),
    Dec: t('months.dec'), December: t('months.dec'),
  };

  // Day abbreviations reuse the existing `weekday` namespace.
  const dayNames: Record<string, string> = {
    Mon: t('weekday.mon'), Tue: t('weekday.tue'), Wed: t('weekday.wed'),
    Thu: t('weekday.thu'), Fri: t('weekday.fri'), Sat: t('weekday.sat'),
    Sun: t('weekday.sun'),
  };

  /**
   * Translates a categorical axis tick. Month / day names are localized;
   * anything else (numeric dates like "05-21", reference codes) is returned
   * unchanged.
   */
  const translateLabel = (value: unknown): string => {
    const key = String(value ?? '');
    return monthNames[key] ?? dayNames[key] ?? key;
  };

  /** Recharts `Tooltip` formatter — returns [formattedValue, translatedName]. */
  const formatTooltipValue = (value: unknown, name: unknown): [string, string] => {
    const label = String(name ?? '');
    return [formatNumber(Number(value)), t(`dashboard.${label}`, { defaultValue: label })];
  };

  /** Recharts `Legend` formatter. */
  const formatLegend = (value: unknown): string => {
    const label = String(value ?? '');
    return t(`dashboard.${label}`, { defaultValue: label });
  };

  /** Reverses a data array for RTL languages so the series reads R→L. */
  const reverseForRTL = <T,>(data: T[]): T[] => (isRTL ? [...data].reverse() : data);

  /**
   * Recharts numeric-axis `tickFormatter`. Recharts passes the tick index as
   * the 2nd argument, so we must NOT pass `formatNumber` directly — its 2nd
   * parameter is `locale`, and a numeric index would corrupt digit shaping.
   */
  const formatAxisNumber = (value: unknown): string => formatNumber(Number(value));

  return {
    isRTL,
    translateLabel,
    formatTooltipValue,
    formatLegend,
    reverseForRTL,
    formatNumber: formatAxisNumber,
  };
}
