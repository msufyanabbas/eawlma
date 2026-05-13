import api from './client';
import * as SecureStore from 'expo-secure-store';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = res.data.data;
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    }
    return { user, tokens };
  },

  register: async (data: Record<string, any>) => {
    const res = await api.post('/auth/register', data);
    const { user, tokens } = res.data.data;
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    }
    return { user, tokens };
  },

  getMe: () => api.get('/users/me').then(r => r.data.data),

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },
};
