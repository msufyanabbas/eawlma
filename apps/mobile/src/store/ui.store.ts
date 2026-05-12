// UI preferences that need to live across screens (language, dark-mode pref,
// unread-count badges). Persists to AsyncStorage in a microtask after every
// change so we don't block React renders on disk writes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'eawlma.ui';

export type ThemePref = 'light' | 'dark' | 'system';

interface UiState {
  language: string;
  themePref: ThemePref;
  unreadMessages: number;
  unreadNotifications: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (lang: string) => void;
  setThemePref: (pref: ThemePref) => void;
  setUnreadMessages: (n: number) => void;
  setUnreadNotifications: (n: number) => void;
}

const persist = (state: Pick<UiState, 'language' | 'themePref'>) => {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useUiStore = create<UiState>((set, get) => ({
  language: 'ar',
  themePref: 'system',
  unreadMessages: 0,
  unreadNotifications: 0,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiState>;
        set({
          language: parsed.language ?? 'ar',
          themePref: parsed.themePref ?? 'system',
          hydrated: true,
        });
        return;
      }
    } catch {
      // Corrupted or missing — start fresh.
    }
    set({ hydrated: true });
  },
  setLanguage: (language) => {
    set({ language });
    persist({ language, themePref: get().themePref });
  },
  setThemePref: (themePref) => {
    set({ themePref });
    persist({ language: get().language, themePref });
  },
  setUnreadMessages: (unreadMessages) => set({ unreadMessages }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
}));
