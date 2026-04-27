import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 30_000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ----- Request interceptor: attach Authorization + locale -------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locale = (typeof window !== 'undefined' && localStorage.getItem('aqarat.locale')) || 'ar';
  config.headers['Accept-Language'] = locale;
  return config;
});

// ----- Response interceptor: refresh-once on 401 ----------------------------

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = useAuthStore.getState().getRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(
        `${baseURL}/api/v1/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const payload = data?.data ?? data;
      const tokens = payload?.tokens;
      const user = payload?.user;
      if (!tokens?.accessToken || !user) return null;
      useAuthStore.getState().setSession(user, tokens);
      return tokens.accessToken as string;
    } catch {
      useAuthStore.getState().clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => {
    // The backend's TransformInterceptor wraps every non-binary response as
    // `{ data, timestamp }`. Unwrap once at the boundary so every callsite
    // sees the actual payload (paginated shape, AuthResponse, listing, etc.).
    const body = res.data;
    if (
      body &&
      typeof body === 'object' &&
      'data' in body &&
      'timestamp' in body
    ) {
      res.data = (body as { data: unknown }).data;
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    // Don't try to refresh on the refresh endpoint itself
    if (status === 401 && original && !original._retry && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
      original._retry = true;
      const newToken = await tryRefresh();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(original);
      }
    }

    return Promise.reject(error);
  },
);

// ----- Helpers --------------------------------------------------------------

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    const m = body?.message ?? body?.error;
    if (Array.isArray(m)) return m.join('. ');
    if (typeof m === 'string') return m;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

/** Unwraps the standard `{ data, timestamp }` envelope. */
export const unwrap = <T>(payload: { data: T } | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};
