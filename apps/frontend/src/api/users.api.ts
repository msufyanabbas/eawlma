import type { User, UpdateProfileRequest } from '@aqarat/shared-types';
import { apiClient, unwrap } from './client';

export const usersApi = {
  me: async (): Promise<User> => {
    const { data } = await apiClient.get<{ data: User }>('/users/me');
    return unwrap<User>(data);
  },

  updateMe: async (payload: UpdateProfileRequest): Promise<User> => {
    const { data } = await apiClient.patch<{ data: User }>('/users/me', payload);
    return unwrap<User>(data);
  },
};
