import {
  Alert,
  Avatar,
  Box,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/api/users.api';
import { extractErrorMessage } from '@/api/client';

export function ProfilePage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
  });

  return (
    <>
      <Helmet>
        <title>{t('nav.profile')} — {t('app.name')}</title>
      </Helmet>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
            {t('nav.profile')}
          </Typography>

          {isLoading && (
            <Stack direction="row" spacing={3} alignItems="center">
              <Skeleton variant="circular" width={80} height={80} />
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Skeleton width="40%" height={28} />
                <Skeleton width="60%" height={20} />
                <Skeleton width="30%" height={20} />
              </Stack>
            </Stack>
          )}

          {isError && (
            <Alert severity="error">{extractErrorMessage(error)}</Alert>
          )}

          {data && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Avatar
                src={data.avatarUrl ?? undefined}
                sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}
              >
                {data.firstName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {data.firstName} {data.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.phone}
                </Typography>
                <Box sx={{ mt: 1, display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: 999, bgcolor: 'primary.light', color: 'primary.contrastText', fontSize: 12, fontWeight: 600 }}>
                  {data.role}
                </Box>
              </Box>
            </Stack>
          )}
        </Paper>
      </Container>
    </>
  );
}
