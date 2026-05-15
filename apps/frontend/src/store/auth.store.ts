import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSessionUser } from '@eawlma/shared-types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;  // epoch ms
  refreshExpiresAt: number; // epoch ms
}

interface AuthState {
  user: AuthSessionUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setSession: (
    user: AuthSessionUser,
    tokens: { accessToken: string; refreshToken: string; accessTokenExpiresIn: number; refreshTokenExpiresIn: number },
  ) => void;
  setUser: (user: AuthSessionUser) => void;
  clearSession: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setSession: (user, tokens) => {
        const now = Date.now();
        set({
          user,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresAt: now + tokens.accessTokenExpiresIn * 1000,
            refreshExpiresAt: now + tokens.refreshTokenExpiresIn * 1000,
          },
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user }),

      clearSession: () => {
        // Wipe per-user oath acceptances — leaving them behind would let the
        // next user signing in on this device skip the commission commitment
        // modal because of a key the previous user wrote.
        try {
          const toRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('commission_oath_')) toRemove.push(key);
          }
          for (const k of toRemove) localStorage.removeItem(k);
        } catch {
          /* localStorage may be disabled — ignore */
        }
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      getAccessToken: () => get().tokens?.accessToken ?? null,
      getRefreshToken: () => get().tokens?.refreshToken ?? null,
    }),
    {
      name: 'eawlma.auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, tokens: state.tokens, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
