import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

interface UIState {
  isDarkMode: boolean;
  language: string;
  toggleDarkMode: (userId?: string | null) => Promise<void>;
  setLanguage: (lang: string, userId?: string | null) => Promise<void>;
  loadPreferences: () => Promise<void>;
  // Pull preferred language + theme from the backend after a fresh login so
  // a returning user sees the language/theme they configured on web/another
  // device. Falls back silently if the call fails — local prefs win.
  loadFromBackend: () => Promise<void>;
  // Internal helper exposed for testing; production callers should use
  // setLanguage / toggleDarkMode which call this for them.
  syncToBackend: (prefs: { preferredLanguage?: string; preferredTheme?: 'light' | 'dark' }) => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  isDarkMode: false,
  language: 'ar',

  syncToBackend: async (prefs) => {
    try {
      await api.patch('/users/me/preferences', prefs);
    } catch {
      /* fire-and-forget — never block the UI on a preference sync */
    }
  },

  toggleDarkMode: async (userId) => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    try {
      await AsyncStorage.setItem('eawlma.darkMode', String(next));
    } catch {}
    if (userId) {
      await get().syncToBackend({ preferredTheme: next ? 'dark' : 'light' });
    }
  },

  setLanguage: async (lang, userId) => {
    set({ language: lang });
    try {
      await AsyncStorage.setItem('eawlma.locale', lang);
    } catch {}
    if (userId) {
      await get().syncToBackend({ preferredLanguage: lang });
    }
  },

  loadPreferences: async () => {
    try {
      const dark = await AsyncStorage.getItem('eawlma.darkMode');
      const lang = await AsyncStorage.getItem('eawlma.locale');
      set({
        isDarkMode: dark === 'true',
        language: lang || 'ar',
      });
    } catch {}
  },

  loadFromBackend: async () => {
    try {
      const res: any = await api.get('/users/me');
      const user = res?.data?.data || res?.data;
      if (user?.preferredLocale) {
        const lang = String(user.preferredLocale);
        set({ language: lang });
        try {
          await AsyncStorage.setItem('eawlma.locale', lang);
        } catch {}
      }
      if (user?.preferredTheme === 'dark' || user?.preferredTheme === 'light') {
        const isDark = user.preferredTheme === 'dark';
        set({ isDarkMode: isDark });
        try {
          await AsyncStorage.setItem('eawlma.darkMode', String(isDark));
        } catch {}
      }
    } catch {
      /* offline or first-run — fall back to local prefs */
    }
  },
}));
