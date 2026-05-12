// Axios client shared by all API modules. Picks up the JWT from the auth
// store on every request and clears the store on 401 so screens that rely
// on `useAuthStore` immediately re-render to the unauthenticated state.
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

import { useAuthStore } from '../store/auth.store';

const FALLBACK_URL = 'http://localhost:3010/api/v1';

function resolveBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl) return extra.apiUrl;
  return FALLBACK_URL;
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      void useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}
