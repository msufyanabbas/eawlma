import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type UiLanguage = 'ar' | 'en';

interface UiState {
  language: UiLanguage;
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  notificationCount: number;
  unreadMessageCount: number;
  setLanguage: (lng: UiLanguage) => void;
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
      themeMode: 'light',
      sidebarOpen: true,
      notificationCount: 0,
      unreadMessageCount: 0,

      setLanguage: (language) => set({ language }),
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
        themeMode: s.themeMode,
        sidebarOpen: s.sidebarOpen,
      }),
    },
  ),
);
