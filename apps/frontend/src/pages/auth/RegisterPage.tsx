import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { UserRole } from '@eawlma/shared-types';

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { GA } from '@/utils/analytics';

const RTL_LANGS = ['ar', 'ur', 'fa', 'he'];
/** Property exterior for the registration branding panel (distinct from login). */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80';

/** 0–4 password-strength score: length, lowercase, uppercase, digit/symbol. */
function scorePassword(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

/**
 * Split-layout registration page mirroring LoginPage: branded property panel
 * on the left, form on the right. Role is picked via cards (not a dropdown),
 * and the password field carries a live strength meter.
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const isRTL = RTL_LANGS.includes(i18n.language);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // OTP-login routes here with a verified email when no account existed yet.
  const [email, setEmail] = useState(
    () => sessionStorage.getItem('eawlma.prefillEmail') ?? '',
  );
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => scorePassword(password), [password]);
  const strengthLabel = [
    t('auth.strengthWeak', 'Weak'),
    t('auth.strengthWeak', 'Weak'),
    t('auth.strengthFair', 'Fair'),
    t('auth.strengthGood', 'Good'),
    t('auth.strengthStrong', 'Strong'),
  ][strength];
  const strengthColor = (['error', 'error', 'warning', 'info', 'success'] as const)[strength];

  // Required-field completion drives the thin progress bar under the heading.
  const filledCount = [firstName, lastName, email, phone, password, confirmPassword].filter(
    (v) => v.trim().length > 0,
  ).length;
  const progress = Math.round((filledCount / 6) * 100);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password) {
      setError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch', 'Passwords do not match'));
      return;
    }
    if (!agreed) {
      setError(t('auth.mustAgreeTerms', 'Please agree to the terms'));
      return;
    }
    const fullPhone = `+966${phone.replace(/\D/g, '')}`;
    if (!/^\+?[1-9]\d{7,14}$/.test(fullPhone)) {
      setError(t('validation.phoneInvalid', 'Please enter a valid phone number'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: fullPhone,
        password,
        role,
        preferredLocale: i18n.language,
      });
      sessionStorage.removeItem('eawlma.prefillEmail');
      setSession(data.user, data.tokens);
      GA.register(role);
      void navigate({ to: '/' });
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.registerFailed', 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: UserRole; icon: string; label: string; desc: string }[] = [
    {
      value: UserRole.USER,
      icon: '🏠',
      label: t('auth.roleBuyer', 'Buyer'),
      desc: t('auth.roleBuyerDesc', 'Looking for a property'),
    },
    {
      value: UserRole.AGENT,
      icon: '👔',
      label: t('auth.roleAgent', 'Agent'),
      desc: t('auth.roleAgentDesc', 'Selling or renting properties'),
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Helmet>
        <title>{`${t('auth.register')} — ${t('app.name')}`}</title>
      </Helmet>

      {/* Left — branding / property image (md and up) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '55%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        <Box
          component="img"
          src={HERO_IMAGE}
          alt=""
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(108,99,166,0.9) 0%, rgba(20,20,40,0.95) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 6,
            color: 'white',
            width: '100%',
          }}
        >
          <Box>
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{
                background: 'linear-gradient(135deg, #fff 0%, #D4A843 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              عولمة
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8, mt: 0.5 }}>
              Eawlma Real Estate
            </Typography>
          </Box>
          <Box>
            <Typography variant="h2" fontWeight={900} sx={{ mb: 2 }}>
              {t('auth.heroTitle', 'Find Your Dream Property')}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
              {t('auth.registerSubtitle', 'Join thousands of users on Eawlma')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right — the form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 460 }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={900} color="primary">
              عولمة
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>
            {t('auth.createAccount', 'Create your account')} ✨
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('auth.registerSubtitle', 'Join thousands of users on Eawlma')}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mb: 3, height: 6, borderRadius: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('auth.firstName', 'First Name')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <TextField
                fullWidth
                label={t('auth.lastName', 'Last Name')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </Stack>

            <TextField
              fullWidth
              label={t('auth.email', 'Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label={t('auth.phone', 'Phone Number')}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              type="tel"
              autoComplete="tel-national"
              placeholder="5XXXXXXXX"
              InputProps={{
                startAdornment: <InputAdornment position="start">+966</InputAdornment>,
              }}
            />

            <Box>
              <TextField
                fullWidth
                label={t('auth.password', 'Password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {password.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(strength / 4) * 100}
                    color={strengthColor}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" fontWeight={700} color={`${strengthColor}.main`}>
                    {strengthLabel}
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              label={t('auth.confirmPassword', 'Confirm Password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleRegister()}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={confirmPassword.length > 0 && confirmPassword !== password}
              helperText={
                confirmPassword.length > 0 && confirmPassword !== password
                  ? t('auth.passwordsNoMatch', 'Passwords do not match')
                  : ' '
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {t('auth.iAmA', 'I am a')}
              </Typography>
              <Stack direction="row" spacing={2}>
                {roles.map((r) => {
                  const selected = role === r.value;
                  return (
                    <Box
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRole(r.value)}
                      sx={{
                        flex: 1,
                        p: 2,
                        border: 2,
                        borderRadius: 3,
                        cursor: 'pointer',
                        textAlign: 'center',
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'rgba(108,99,166,0.08)' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Typography fontSize={32}>{r.icon}</Typography>
                      <Typography fontWeight={700}>{r.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.desc}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <FormControlLabel
              control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
              label={
                <Typography variant="body2" color="text.secondary">
                  {t('auth.agreeToTerms', 'I agree to the Terms of Service and Privacy Policy')}
                </Typography>
              }
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => void handleRegister()}
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
            >
              {loading ? <CircularProgress size={24} /> : t('auth.signUp', 'Create Account')}
            </Button>
          </Stack>

          <Typography align="center" color="text.secondary" sx={{ mt: 3 }}>
            {t('auth.hasAccount', 'Already have an account?')}{' '}
            <Link to="/auth/login" style={{ color: '#6C63A6', fontWeight: 700 }}>
              {t('auth.signIn', 'Sign In')}
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
