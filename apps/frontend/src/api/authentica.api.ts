import { apiClient, unwrap } from './client';

export interface AuthenticaInitResponse {
  verificationId: string;
  status: 'pending' | 'verified' | 'rejected';
  redirectUrl: string | null;
  /** True when the backend hit the live Authentica.sa API; false in dev-stub mode. */
  live: boolean;
}

export const authenticaApi = {
  init: async (
    nationalId: string,
    phone: string,
    callbackUrl?: string,
  ): Promise<AuthenticaInitResponse> => {
    const { data } = await apiClient.post<{ data: AuthenticaInitResponse }>(
      '/auth/authentica/init',
      { nationalId, phone, callbackUrl },
    );
    return unwrap<AuthenticaInitResponse>(data);
  },
};
