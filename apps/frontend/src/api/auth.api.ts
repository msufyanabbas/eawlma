import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';

/**
 * `/auth/verify-otp` either logs the user in (returns the usual auth payload)
 * or — when no account matches the email — asks the client to register.
 */
export type VerifyOtpResult =
  | AuthResponse
  | { needsRegistration: true; email: string };

export const authApi = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<{ data: RegisterResponse }>(
      '/auth/register',
      payload,
    );
    return unwrap<RegisterResponse>(data);
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/login', payload);
    return unwrap<AuthResponse>(data);
  },

  /** Request a 6-digit email login code. */
  sendOtp: async (email: string): Promise<{ message: string; expiresIn: number }> => {
    const { data } = await apiClient.post<{ data: { message: string; expiresIn: number } }>(
      '/auth/send-otp',
      { email },
    );
    return unwrap(data);
  },

  /** Verify an email code — logs in, or returns `needsRegistration`. */
  verifyOtp: async (email: string, otp: string): Promise<VerifyOtpResult> => {
    const { data } = await apiClient.post<{ data: VerifyOtpResult }>('/auth/verify-otp', {
      email,
      otp,
    });
    return unwrap<VerifyOtpResult>(data);
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },
};
