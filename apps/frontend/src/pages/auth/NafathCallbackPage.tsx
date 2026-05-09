import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

/**
 * Lands here after Nafath finishes the OAuth round-trip. The backend appends
 * `?accessToken=…&refreshToken=…` to the URL — we hydrate the store with both,
 * then load `/users/me` to populate the user record before bouncing the user
 * to the home page (or the `?returnTo` URL if present).
 */
export function NafathCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const returnTo = params.get('returnTo') ?? '/';

    if (!accessToken || !refreshToken) {
      void navigate({ to: '/auth/login' });
      return;
    }

    void (async () => {
      try {
        const { data } = await apiClient.get('/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        // setSession expects the issuer's TTL — we don't get them in the
        // redirect, so use sensible defaults that match the backend's config:
        // 15m access / 7d refresh. The interceptor will refresh on 401 anyway.
        setSession(data, {
          accessToken,
          refreshToken,
          accessTokenExpiresIn: 15 * 60,
          refreshTokenExpiresIn: 7 * 24 * 60 * 60,
        });
        void navigate({ to: returnTo as never });
      } catch {
        void navigate({ to: '/auth/login' });
      }
    })();
  }, [navigate, setSession]);

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {t('common.loading')}
        </Typography>
      </Stack>
    </Box>
  );
}
