import type { User, UpdateProfileRequest, AuthSessionUser } from '@eawlma/shared-types';
import { apiClient, unwrap } from './client';
import { queryClient } from './queryClient';
import { useAuthStore } from '@/store/auth.store';

export interface UpdatePreferencesRequest {
  preferredLanguage?: string;
  preferredTheme?: 'light' | 'dark';
}

// `AuthSessionUser` is a narrow projection of the full `User` shape — the auth
// store only persists the fields the navbar/avatar/guard logic needs. Profile
// updates return the full row, so we project here whenever the store is
// rehydrated from a fresh `/users/me` payload.
function projectAuthUser(user: User): AuthSessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    preferredLocale: user.preferredLocale,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    identityVerified: user.identityVerificationStatus === 'verified',
  };
}

/**
 * Push a freshly-loaded `User` into the React Query cache + Zustand auth store.
 * Called from every profile/preference mutation so the navbar avatar, language,
 * and theme update instantly across tabs without a re-login.
 */
export function syncMeToClient(user: User): User {
  queryClient.setQueryData(['users', 'me'], user);
  void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
  useAuthStore.getState().setUser(projectAuthUser(user));
  return user;
}

export const usersApi = {
  me: async (): Promise<User> => {
    const { data } = await apiClient.get<{ data: User }>('/users/me');
    return unwrap<User>(data);
  },

  updateMe: async (payload: UpdateProfileRequest): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>('/users/me', payload);
    return syncMeToClient(unwrap<User>(data));
  },

  updatePreferences: async (payload: UpdatePreferencesRequest): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>('/users/me/preferences', payload);
    return syncMeToClient(unwrap<User>(data));
  },
};
