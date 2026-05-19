import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { NotificationService } from '../services/notifications.service';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'agent' | 'agency_owner' | 'admin';
  avatarUrl?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),

  logout: async () => {
    // Unregister the push token first so the backend stops sending pushes
    // to this device. Failure here must NOT block logout — the user has
    // already pressed Sign out.
    try {
      await NotificationService.unregisterDevice();
    } catch {
      /* non-fatal */
    }
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch {}
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      set({ token, isLoading: false, isAuthenticated: !!token });
    } catch {
      set({ isLoading: false });
    }
  },
}));
