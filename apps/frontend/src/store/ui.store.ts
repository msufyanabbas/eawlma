import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/api/client';

export type ThemeMode = 'light' | 'dark';
// Any locale code we ship UI translations for. The full list is centralized in
// src/i18n/index.ts; we keep this as `string` so adding a new locale doesn't
// require touching every store/handler signature.
export type UiLanguage = string;

interface UiState {
  language: UiLanguage;
  // Display locale used by the message translation service. Defaults to the
  // active UI language, but may be set to any 2-letter code (fr, es, de, …)
  // so users can read incoming messages in their preferred reading language
  // without forcing a full UI swap.
  displayLocale: string;
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  notificationCount: number;
  unreadMessageCount: number;
  setLanguage: (lng: UiLanguage, userId?: string | null) => void;
  setDisplayLocale: (locale: string) => void;
  setThemeMode: (mode: ThemeMode, userId?: string | null) => void;
  toggleThemeMode: (userId?: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationCount: (n: number) => void;
  incrementNotificationCount: (by?: number) => void;
  setUnreadMessageCount: (n: number) => void;
  // Pull the persisted preferences from the backend after a fresh login so a
  // returning user sees the language/theme they configured on another device.
  loadFromBackend: () => Promise<void>;
}

function persistLocale(language: string) {
  try {
    localStorage.setItem('eawlma.locale', language);
  } catch {
    /* localStorage may be disabled — ignore */
  }
}

function syncToBackend(prefs: { preferredLanguage?: string; preferredTheme?: ThemeMode }) {
  // Fire-and-forget — preference sync is decorative and must not block the UI
  // when the user is offline / the backend is down.
  void apiClient
    .patch('/users/me/preferences', prefs)
    .catch(() => undefined);
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      language: 'ar',
      displayLocale: 'ar',
      themeMode: 'light',
      sidebarOpen: true,
      notificationCount: 0,
      unreadMessageCount: 0,

      setLanguage: (language, userId) => {
        set({ language, displayLocale: language });
        persistLocale(language);
        if (userId) syncToBackend({ preferredLanguage: language });
      },
      setDisplayLocale: (displayLocale) => set({ displayLocale }),
      setThemeMode: (themeMode, userId) => {
        set({ themeMode });
        if (userId) syncToBackend({ preferredTheme: themeMode });
      },
      toggleThemeMode: (userId) => {
        const next: ThemeMode = get().themeMode === 'light' ? 'dark' : 'light';
        set({ themeMode: next });
        if (userId) syncToBackend({ preferredTheme: next });
      },
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setNotificationCount: (notificationCount) => set({ notificationCount }),
      incrementNotificationCount: (by = 1) =>
        set({ notificationCount: get().notificationCount + by }),
      setUnreadMessageCount: (unreadMessageCount) => set({ unreadMessageCount }),

      loadFromBackend: async () => {
        try {
          // apiClient unwraps the TransformInterceptor envelope, so the user
          // sits at res.data directly.
          const res = await apiClient.get('/users/me');
          const user = res.data;
          if (user?.preferredLocale) {
            const lang = String(user.preferredLocale);
            set({ language: lang, displayLocale: lang });
            persistLocale(lang);
          }
          if (user?.preferredTheme === 'dark' || user?.preferredTheme === 'light') {
            set({ themeMode: user.preferredTheme });
          }
        } catch {
          /* ignore — fall back to whatever's in localStorage */
        }
      },
    }),
    {
      name: 'eawlma.ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        language: s.language,
        displayLocale: s.displayLocale,
        themeMode: s.themeMode,
        sidebarOpen: s.sidebarOpen,
      }),
    },
  ),
);
