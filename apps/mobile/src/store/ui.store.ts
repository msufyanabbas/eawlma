import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIState {
  isDarkMode: boolean;
  language: string;
  toggleDarkMode: () => void;
  setLanguage: (lang: string) => void;
  loadPreferences: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  isDarkMode: false,
  language: 'ar',

  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    AsyncStorage.setItem('eawlma.darkMode', String(next));
  },

  setLanguage: (lang) => {
    set({ language: lang });
    AsyncStorage.setItem('eawlma.locale', lang);
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
}));
