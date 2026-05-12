import { apiClient } from './client';
import type { AuthUser } from '../store/auth.store';

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'agent';
    phone?: string;
  }): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/register', input);
    return data;
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort; the client clears local state regardless.
    }
  },
};
