import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
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
import { posthog } from '@/lib/posthog';
import { AuthLanguageSwitcher } from '@/components/auth/AuthLanguageSwitcher';

const RTL_LANGS = ['ar', 'ur', 'fa', 'he'];
/** Bright luxury-property photo for the branding panel — matches LoginPage. */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80';

/**
 * Split-layout registration page mirroring LoginPage: branded property panel
 * on the left (md+ only), form on the right. Minimal-friction signup —
 * email + role + optional password.
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const isRTL = RTL_LANGS.includes(i18n.language);

  const [email, setEmail] = useState(
    () => sessionStorage.getItem('eawlma.prefillEmail') ?? '',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired', 'Please enter your email'));
      return;
    }
    if (usePassword && password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authApi.register({
        email: email.trim(),
        password: usePassword ? password : undefined,
        role,
        preferredLocale: i18n.language,
      });
      sessionStorage.removeItem('eawlma.prefillEmail');
      GA.register(role);
      posthog.capture('user_registered', { role });

      // Email-only signups can't be logged in until the OTP is verified.
      if ('requiresVerification' in data) {
        sessionStorage.setItem('eawlma.prefillEmail', data.email);
        void navigate({ to: '/auth/verify', search: { email: data.email } });
        return;
      }

      setSession(data.user, data.tokens);
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
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Lighter overlay — the property still reads through clearly. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(108,99,166,0.75) 0%, rgba(15,52,96,0.85) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 6,
            width: '100%',
          }}
        >
          {/* Top — Logo */}
          <Box>
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #D4A843 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              عولمة
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem' }}>
              Eawlma Real Estate
            </Typography>
          </Box>

          {/* Middle — Hero text + stats */}
          <Box>
            <Typography
              variant="h2"
              fontWeight={900}
              color="white"
              sx={{ mb: 2, lineHeight: 1.2, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
            >
              {t('auth.heroTitle', 'Find Your Dream Property')}
            </Typography>
            <Typography
              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', mb: 4, lineHeight: 1.7 }}
            >
              {t('auth.heroSubtitle', "Saudi Arabia's premier real estate platform")}
            </Typography>

            <Stack direction="row" spacing={4}>
              {[
                { value: '10K+', label: t('auth.statListings', 'Listings') },
                { value: '500+', label: t('auth.statAgents', 'Verified Agents') },
                { value: '50K+', label: t('auth.statUsers', 'Happy Users') },
              ].map((stat) => (
                <Box key={stat.label} sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{ color: '#D4A843', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Bottom — Trust badge */}
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              p: 2.5,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
              ⭐ {t('auth.trustedPlatform', 'Trusted by thousands across Saudi Arabia')}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
              {t('auth.platformDesc', 'Secure • Verified Agents • Best Properties')}
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
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <AuthLanguageSwitcher />
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={900} color="primary">
              عولمة
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>
            {t('auth.createAccount', 'Create your account')} ✨
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {t('auth.registerSubtitle', 'Join Eawlma and start your property journey')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              fullWidth
              label={t('auth.email', 'Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Role selector */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {t('auth.iAmA', 'I am a')}
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {roles.map((r) => {
                  const selected = role === r.value;
                  return (
                    <Box
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') && setRole(r.value)
                      }
                      sx={{
                        flex: 1,
                        p: 1.5,
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
                      <Typography fontSize={24}>{r.icon}</Typography>
                      <Typography fontWeight={700} variant="body2">
                        {r.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.desc}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Optional password toggle */}
            <Box
              onClick={() => setUsePassword((p) => !p)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                color: 'text.secondary',
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  border: 2,
                  borderColor: usePassword ? 'primary.main' : 'divider',
                  borderRadius: 0.5,
                  bgcolor: usePassword ? 'primary.main' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {usePassword && (
                  <Typography sx={{ color: 'white', fontSize: 12, lineHeight: 1 }}>
                    ✓
                  </Typography>
                )}
              </Box>
              <Typography variant="body2">
                {t('auth.setPassword', 'Set a password (optional)')}
              </Typography>
            </Box>

            {usePassword && (
              <>
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
                <TextField
                  fullWidth
                  label={t('auth.confirmPassword', 'Confirm Password')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleRegister()}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  error={confirmPassword.length > 0 && confirmPassword !== password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => void handleRegister()}
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                t('auth.createAccount', 'Create Account')
              )}
            </Button>
          </Stack>

          <Typography align="center" color="text.secondary" sx={{ mt: 3 }}>
            {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link to="/auth/login" style={{ color: '#6C63A6', fontWeight: 700 }}>
              {t('auth.signIn', 'Sign in')}
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
