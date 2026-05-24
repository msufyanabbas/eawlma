import {
  Alert,
  AlertTitle,
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
import VerifiedIcon from '@mui/icons-material/Verified';
import BadgeIcon from '@mui/icons-material/Badge';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@eawlma/shared-types';

import { usersApi } from '@/api/users.api';
import { listingsApi } from '@/api/listings.api';
import { apiClient, extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';
import { ListingCard } from '@/components/global/ListingCard';
import { getRecentlyViewed } from '@/utils/recentlyViewed';

const AGENT_ROLES = new Set<UserRole>([UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN]);

export function ProfilePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
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
  const [regaNumber, setRegaNumber] = useState('');
  const [regaExpiry, setRegaExpiry] = useState('');
  const [nafathLoading, setNafathLoading] = useState(false);
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
    setRegaNumber(data.licenseNumber ?? '');
    setRegaExpiry(
      data.regaLicenseExpiry
        ? String(data.regaLicenseExpiry).slice(0, 10)
        : '',
    );
  }, [data]);

  // usersApi.updateMe centralizes cache invalidation + auth store projection.
  // We only need to show the success/error toast here.
  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
      }),
    onSuccess: () => {
      setToast({ open: true, ok: true, msg: t('profilePage.profileUpdated') });
    },
    onError: (err) => {
      setToast({ open: true, ok: false, msg: extractErrorMessage(err) });
    },
  });

  const regaMutation = useMutation({
    mutationFn: () =>
      usersApi.submitRegaLicense({
        licenseNumber: regaNumber.trim(),
        expiryDate: regaExpiry,
      }),
    onSuccess: () => {
      setToast({
        open: true,
        ok: true,
        msg: t('agent.regaPending', 'License submitted - pending verification'),
      });
    },
    onError: (err) => {
      setToast({ open: true, ok: false, msg: extractErrorMessage(err) });
    },
  });

  const handleNafathVerify = async () => {
    setNafathLoading(true);
    try {
      // The nafath authorize endpoint 302-redirects, so we just bounce the
      // browser directly. No JSON to parse on the way out.
      const baseURL = apiClient.defaults.baseURL ?? '';
      window.location.href = `${baseURL.replace(/\/$/, '')}/auth/nafath/authorize`;
    } catch (err) {
      setNafathLoading(false);
      setToast({
        open: true,
        ok: false,
        msg: t('agent.nafathError', 'Could not connect to Nafath'),
      });
    }
  };

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

        {/* ---- REGA broker licence + Nafath identity (agents only) ---- */}
        {isAgent && data && (
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              {t('agent.regaSection', 'REGA License')}
            </Typography>

            {data.regaVerified ? (
              <Alert severity="success" icon={<VerifiedIcon />}>
                <AlertTitle>
                  {t('agent.regaVerifiedTitle', 'REGA License Verified')}
                </AlertTitle>
                {t('agent.regaLicenseNumber', 'REGA License Number')}:{' '}
                <strong>{data.licenseNumber}</strong>
              </Alert>
            ) : data.licenseNumber ? (
              <Alert severity="warning">
                {t(
                  'agent.regaPending',
                  'License submitted - pending verification',
                )}
              </Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t(
                    'agent.regaDesc',
                    'Enter your REGA license number to get verified badge',
                  )}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={t('agent.regaLicenseNumber', 'REGA License Number')}
                      value={regaNumber}
                      onChange={(e) => setRegaNumber(e.target.value)}
                      placeholder="e.g. FA-12345678"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label={t('agent.regaExpiryDate', 'License Expiry Date')}
                      value={regaExpiry}
                      onChange={(e) => setRegaExpiry(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<VerifiedIcon />}
                      onClick={() => regaMutation.mutate()}
                      disabled={
                        regaMutation.isPending || !regaNumber.trim() || !regaExpiry
                      }
                      sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
                    >
                      {regaMutation.isPending
                        ? t('common.loading')
                        : t('agent.submitRega', 'Submit for Verification')}
                    </Button>
                  </Grid>
                </Grid>
              </>
            )}

            <Typography variant="h6" sx={{ fontWeight: 800, mt: 4, mb: 2 }}>
              {t('agent.identityVerification', 'Identity Verification')}
            </Typography>

            {data.isNafathVerified ? (
              <Alert severity="success" icon={<BadgeIcon />}>
                <AlertTitle>
                  {t(
                    'agent.nafathVerifiedTitle',
                    'Identity Verified via Nafath',
                  )}
                </AlertTitle>
                {t(
                  'agent.nafathVerifiedDesc',
                  'Your Saudi national ID has been verified',
                )}
              </Alert>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>
                    {t('agent.nafathTitle', 'Verify with Nafath')}
                  </AlertTitle>
                  {t(
                    'agent.nafathDesc',
                    'Verify your Saudi national ID through Nafath',
                  )}
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<BadgeIcon />}
                  onClick={handleNafathVerify}
                  disabled={nafathLoading}
                  sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
                >
                  {nafathLoading
                    ? t('common.loading')
                    : t('agent.verifyWithNafath', 'Verify with Nafath')}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  {t(
                    'agent.nafathNote',
                    'You will be redirected to Nafath',
                  )}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

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
