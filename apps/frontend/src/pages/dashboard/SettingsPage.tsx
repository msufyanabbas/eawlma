import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { usersApi } from '@/api/users.api';
import { authApi } from '@/api/auth.api';
import { authenticaApi } from '@/api/authentica.api';
import { storageApi } from '@/api/storage.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { ConfirmDialog } from '@/components/global/ConfirmDialog';

export function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  const meQuery = useQuery({ queryKey: ['users', 'me'], queryFn: () => usersApi.me() });
  const me = meQuery.data;

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName);
    setLastName(me.lastName);
    setPhone(me.phone);
    setBio(me.bio ?? '');
    setAvatarUrl(me.avatarUrl);
  }, [me]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const { publicUrl } = await storageApi.uploadFile(file, 'avatar', 'avatars');
      setAvatarUrl(publicUrl);
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        firstName,
        lastName,
        phone,
        bio,
        avatarUrl: avatarUrl ?? undefined,
      }),
    onSuccess: (data) => {
      setUser({
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        avatarUrl: data.avatarUrl,
        preferredLocale: data.preferredLocale,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        identityVerified: data.identityVerificationStatus === 'verified',
      });
      void qc.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });

  // Authentica.sa identity verification
  const [nationalId, setNationalId] = useState('');
  const [authenticaPhone, setAuthenticaPhone] = useState('');
  const verifyMutation = useMutation({
    mutationFn: () =>
      authenticaApi.init(
        nationalId.trim(),
        authenticaPhone.trim() || phone,
        window.location.href,
      ),
    onSuccess: (resp) => {
      if (resp.redirectUrl) {
        // The agent must complete the flow on Authentica.sa.
        window.location.href = resp.redirectUrl;
      } else {
        void qc.invalidateQueries({ queryKey: ['users', 'me'] });
      }
    },
  });

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPwd, newPwd),
    onSuccess: () => {
      setCurrentPwd('');
      setNewPwd('');
    },
  });

  // Notification preferences (client-side only — backend prefs endpoint TBD)
  const [emailOnInquiry, setEmailOnInquiry] = useState(true);
  const [emailOnMessage, setEmailOnMessage] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Account deletion
  const [confirmDelete, setConfirmDelete] = useState(false);
  const onDeleteAccount = () => {
    // Backend has no /users/me DELETE yet — clear local session as a stand-in.
    clearSession();
    setConfirmDelete(false);
    window.location.href = '/';
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.settings')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('dashboard.settings')} />

      {/* Personal info */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Personal info</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Stack alignItems="center" spacing={1.5}>
              <Avatar src={avatarUrl ?? undefined} sx={{ width: 96, height: 96 }}>
                {firstName?.[0]?.toUpperCase()}
              </Avatar>
              <Button
                size="small"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={onAvatarChange}
              />
              {uploadError && <Typography variant="caption" color="error">{uploadError}</Typography>}
            </Stack>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('auth.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('auth.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('auth.email')} value={me?.email ?? ''} disabled /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} /></Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? t('common.loading') : t('common.save')}
                </Button>
                {updateProfileMutation.isError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{extractErrorMessage(updateProfileMutation.error)}</Alert>
                )}
                {updateProfileMutation.isSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>Profile updated.</Alert>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Agency info — placeholder for now */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Agency</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Agency name" disabled placeholder="Set up by your agency admin" /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="License number" disabled /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Registration number" disabled /></Grid>
        </Grid>
      </Paper>

      {/* Identity verification (Authentica.sa) */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Identity verification</Typography>
          {me?.identityVerificationStatus === 'verified' && (
            <Box
              sx={{
                px: 1.25,
                py: 0.25,
                borderRadius: 999,
                bgcolor: 'success.light',
                color: 'success.contrastText',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              Verified ✓
            </Box>
          )}
          {me?.identityVerificationStatus === 'pending' && (
            <Box sx={{ px: 1.25, py: 0.25, borderRadius: 999, bgcolor: 'warning.light', color: 'warning.contrastText', fontSize: 12, fontWeight: 700 }}>
              Pending
            </Box>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Verify with Saudi national ID or Iqama via Authentica.sa to earn the
          gold verified badge on your public profile. Listings from verified
          agents convert significantly better.
        </Typography>
        {me?.identityVerificationStatus === 'verified' ? (
          <Alert severity="success">Your identity is verified.</Alert>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="National ID / Iqama (10 digits)"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('auth.phone')}
                placeholder="+9665XXXXXXXX"
                value={authenticaPhone}
                onChange={(e) => setAuthenticaPhone(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="success"
                disabled={verifyMutation.isPending || nationalId.length !== 10}
                onClick={() => verifyMutation.mutate()}
              >
                {verifyMutation.isPending ? t('common.loading') : 'Verify Identity'}
              </Button>
              {verifyMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>{extractErrorMessage(verifyMutation.error)}</Alert>
              )}
              {verifyMutation.isSuccess && !verifyMutation.data?.live && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Authentica.sa API key isn't configured on the server — your verification has been
                  recorded as <strong>pending</strong> for testing. Set <code>AUTHENTICA_API_KEY</code>
                  in the backend to use the live flow.
                </Alert>
              )}
              {verifyMutation.isSuccess && verifyMutation.data?.live && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Verification started. {verifyMutation.data.redirectUrl
                    ? <>Redirecting to Authentica.sa…</>
                    : <>You'll receive an OTP shortly to complete verification.</>}
                </Alert>
              )}
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Notification preferences */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Notification preferences</Typography>
        <Stack>
          <FormControlLabel
            control={<Switch checked={emailOnInquiry} onChange={(_, v) => setEmailOnInquiry(v)} />}
            label="Email me when I receive a new inquiry"
          />
          <FormControlLabel
            control={<Switch checked={emailOnMessage} onChange={(_, v) => setEmailOnMessage(v)} />}
            label="Email me when I receive a new message"
          />
          <FormControlLabel
            control={<Switch checked={pushNotifications} onChange={(_, v) => setPushNotifications(v)} />}
            label="Browser push notifications"
          />
        </Stack>
      </Paper>

      {/* Password change */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Change password</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth type="password" label="Current password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth type="password" label="New password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              disabled={passwordMutation.isPending || !currentPwd || newPwd.length < 8}
              onClick={() => passwordMutation.mutate()}
            >
              {passwordMutation.isPending ? t('common.loading') : 'Update password'}
            </Button>
            {passwordMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>{extractErrorMessage(passwordMutation.error)}</Alert>
            )}
            {passwordMutation.isSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>Password changed. All other sessions have been signed out.</Alert>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Danger zone */}
      <Paper sx={{ p: 3, border: 1, borderColor: 'error.light' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
          Danger zone
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Typography>
        <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)}>
          Delete account
        </Button>
      </Paper>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete account"
        description="This will sign you out and remove your access to Eawlma. We'll keep audit/payment records as required by law."
        destructive
        confirmLabel="Delete"
        onConfirm={onDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </DashboardLayout>
  );
}
