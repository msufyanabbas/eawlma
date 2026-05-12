import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  setLanguage: (lng: UiLanguage) => void;
  setDisplayLocale: (locale: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationCount: (n: number) => void;
  incrementNotificationCount: (by?: number) => void;
  setUnreadMessageCount: (n: number) => void;
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

      setLanguage: (language) => set({ language, displayLocale: language }),
      setDisplayLocale: (displayLocale) => set({ displayLocale }),
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () => set({ themeMode: get().themeMode === 'light' ? 'dark' : 'light' }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setNotificationCount: (notificationCount) => set({ notificationCount }),
      incrementNotificationCount: (by = 1) =>
        set({ notificationCount: get().notificationCount + by }),
      setUnreadMessageCount: (unreadMessageCount) => set({ unreadMessageCount }),
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
