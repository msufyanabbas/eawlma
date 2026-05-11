import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@eawlma/shared-types';

import { usersApi } from '@/api/users.api';
import { listingsApi } from '@/api/listings.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';
import { ListingCard } from '@/components/global/ListingCard';
import { getRecentlyViewed } from '@/utils/recentlyViewed';

const AGENT_ROLES = new Set<UserRole>([UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN]);

export function ProfilePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const sessionUser = useAuthStore((s) => s.user);
  const savedIds = useSavedStore((s) => s.ids);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
  });

  // Local form state — hydrated from query, edited in place.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [toast, setToast] = useState<{ open: boolean; ok: boolean; msg: string }>({
    open: false, ok: true, msg: '',
  });

  useEffect(() => {
    if (!data) return;
    setFirstName(data.firstName ?? '');
    setLastName(data.lastName ?? '');
    setPhone(data.phone ?? '');
    setAvatarUrl(data.avatarUrl ?? '');
    setBio((data as unknown as { bio?: string }).bio ?? '');
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
      }),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['users', 'me'] });
      // Refresh the auth store user copy so the navbar avatar updates instantly.
      // The full `User` shape is wider than `AuthSessionUser`, so we project the
      // fields the session cares about and translate `identityVerificationStatus`
      // into the boolean the auth store consumes.
      setUser({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        preferredLocale: updated.preferredLocale,
        emailVerified: updated.emailVerified,
        phoneVerified: updated.phoneVerified,
        identityVerified: updated.identityVerificationStatus === 'verified',
      });
      setToast({ open: true, ok: true, msg: t('profilePage.profileUpdated') });
    },
    onError: (err) => {
      setToast({ open: true, ok: false, msg: extractErrorMessage(err) });
    },
  });

  // Recently viewed — last 3 from localStorage
  const recentIds = getRecentlyViewed().slice(0, 3);
  const recentQueries = useQueries({
    queries: recentIds.map((id) => ({
      queryKey: ['listings', id],
      queryFn: () => listingsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const recentlyViewed = recentQueries
    .map((q) => q.data)
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const isAgent = sessionUser ? AGENT_ROLES.has(sessionUser.role as UserRole) : false;

  const initials = `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` || 'U';

  return (
    <Box>
      <Helmet>
        <title>{t('nav.profile')} — {t('app.name')}</title>
      </Helmet>

      {/* ---- Lavender banner ---- */}
      <Box
        sx={{
          height: { xs: 160, md: 200 },
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main} 100%)`,
        }}
      />

      <Container
        maxWidth={false}
        sx={{
          maxWidth: 1440,
          mx: 'auto',
          px: { xs: 3, sm: 4, md: 6, lg: 8 },
          mt: { xs: -8, md: -10 },
          pb: 8,
        }}
      >
        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
          {isLoading ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
              <Skeleton variant="circular" width={100} height={100} />
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Skeleton width="40%" height={32} />
                <Skeleton width="60%" />
              </Stack>
            </Stack>
          ) : isError ? (
            <Alert severity="error">{extractErrorMessage(error)}</Alert>
          ) : data ? (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Avatar
                src={avatarUrl || undefined}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 800,
                  fontSize: 36,
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: 4,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {firstName} {lastName}
                  </Typography>
                  <Chip
                    label={data.role}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.dark',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">{data.email}</Typography>
                {phone && (
                  <Typography variant="body2" color="text.secondary">{phone}</Typography>
                )}
              </Box>
              {isAgent && (
                <Button
                  component={Link}
                  to="/dashboard"
                  startIcon={<DashboardIcon />}
                  variant="contained"
                  sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
                >
                  {t('nav.dashboard')}
                </Button>
              )}
            </Stack>
          ) : null}
        </Paper>

        {/* ---- Edit form ---- */}
        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
            {t('profile.personalInfo')}
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField label={t('profile.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={t('profile.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={t('profile.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth placeholder="+9665XXXXXXXX" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={t('profile.email')} value={data?.email ?? ''} fullWidth disabled />
            </Grid>
            <Grid item xs={12}>
              <TextField label={t('profile.avatar')} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} fullWidth placeholder="https://..." />
            </Grid>
            <Grid item xs={12}>
              <TextField label={t('profile.bio')} value={bio} onChange={(e) => setBio(e.target.value)} multiline minRows={3} fullWidth />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
            >
              {updateMutation.isPending ? t('common.loading') : t('profile.saveChanges')}
            </Button>
          </Stack>
        </Paper>

        {/* ---- Saved + recent activity ---- */}
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FavoriteIcon sx={{ color: 'primary.dark' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    {t('profile.savedProperties')}
                  </Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {savedIds.length}
                  </Typography>
                </Box>
              </Stack>
              <Button
                component={Link}
                to="/saved"
                fullWidth
                variant="outlined"
              >
                {t('profile.viewSaved')}
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <HistoryIcon sx={{ color: 'primary.dark' }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('profile.recentActivity')}</Typography>
              </Stack>
              {recentlyViewed.length === 0 ? (
                <Stack alignItems="flex-start" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {t('profilePage.recentEmptyHint')}
                  </Typography>
                  <Button onClick={() => void navigate({ to: '/search' })} variant="contained" size="small" sx={{ background: theme.eawlma.gradient }}>
                    {t('profilePage.browseListings')}
                  </Button>
                </Stack>
              ) : (
                <Grid container spacing={2}>
                  {recentlyViewed.map((l) => (
                    <Grid key={l.id} item xs={12} sm={6} md={4}>
                      <ListingCard listing={l} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.ok ? 'success' : 'error'} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
