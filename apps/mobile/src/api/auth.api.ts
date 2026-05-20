import api from './client';
import * as SecureStore from 'expo-secure-store';

async function persistTokens(tokens: { accessToken: string; refreshToken?: string }) {
  await SecureStore.setItemAsync('accessToken', tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = res.data.data;
    await persistTokens(tokens);
    return { user, tokens };
  },

  register: async (data: Record<string, any>) => {
    const res = await api.post('/auth/register', data);
    const { user, tokens } = res.data.data;
    await persistTokens(tokens);
    return { user, tokens };
  },

  /** Request a 6-digit email login code. */
  sendOtp: async (email: string) => {
    const res = await api.post('/auth/send-otp', { email });
    return res.data.data as { message: string; expiresIn: number };
  },

  /**
   * Verify an email code. On success for an existing account this returns
   * `{ user, tokens }` (and persists the tokens); when no account matches it
   * returns `{ needsRegistration: true, email }` so the caller can register.
   */
  verifyOtp: async (email: string, otp: string) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const result = res.data.data as
      | { user: any; tokens: { accessToken: string; refreshToken?: string } }
      | { needsRegistration: true; email: string };
    if ('tokens' in result && result.tokens) {
      await persistTokens(result.tokens);
    }
    return result;
  },

  getMe: () => api.get('/users/me').then((r) => r.data.data),

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },
};
