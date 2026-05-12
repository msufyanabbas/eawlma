// Authenticated user + access token. Stored in SecureStore so it survives
// app restarts but isn't readable by other apps. The Zustand store mirrors
// the secure-store state so screens get reactive updates.
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'eawlma.token';
const USER_KEY = 'eawlma.user';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'user' | 'agent' | 'admin' | 'moderator' | 'agency_admin';
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAuth: (user: AuthUser, token: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  hydrate: async () => {
    const [token, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
    set({ token, user, hydrated: true });
  },
  setAuth: async (user, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, token: null });
  },
}));
