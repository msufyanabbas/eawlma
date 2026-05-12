// RTL helpers. Reload-on-flip is the well-known React Native quirk: changing
// I18nManager only affects newly-mounted views, so we have to call
// Updates.reloadAsync() when the user toggles between an LTR and RTL locale.
// We keep the list of RTL codes in one place so screens can ask
// `isRtlLanguage(lang)` without hard-coding the table.
import { I18nManager, Platform } from 'react-native';

const RTL_CODES = new Set(['ar', 'ur', 'fa', 'he']);

export function isRtlLanguage(code: string): boolean {
  return RTL_CODES.has(code);
}

/**
 * Force RN's layout direction to match the active locale. Returns `true` if
 * the call flipped the direction (caller should then prompt for a reload).
 */
export function syncRtlForLanguage(code: string): boolean {
  const wantRtl = isRtlLanguage(code);
  if (wantRtl === I18nManager.isRTL) return false;
  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);
  return true;
}

export function isCurrentlyRtl(): boolean {
  return I18nManager.isRTL;
}

export const SUPPORTS_HOT_RTL_FLIP = Platform.OS === 'ios';
