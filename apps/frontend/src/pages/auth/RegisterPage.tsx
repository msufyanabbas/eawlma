import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
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

/**
 * Minimal-friction signup, Aqar-style: email + role + optional password. When
 * the password toggle is off we still create the account; the user can finish
 * verification via OTP from the login page.
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
      setSession(data.user, data.tokens);
      GA.register(role);
      posthog.capture('user_registered', { role });
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <Helmet>
        <title>{`${t('auth.register')} — ${t('app.name')}`}</title>
      </Helmet>

      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <AuthLanguageSwitcher />
        </Box>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" fontWeight={900} color="primary" sx={{ mb: 0.5 }}>
            {isRTL ? 'عولمة' : 'Eawlma'}
          </Typography>
          <Typography color="text.secondary">
            {t('auth.createAccount', 'Create your account')}
          </Typography>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 3 }} elevation={2}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            size="small"
            type="email"
            label={t('auth.email', 'Email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            sx={{ mb: 3 }}
          />

          <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
            {t('auth.iAmA', 'I am a')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
              mb: 3,
            }}
          >
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
                    p: 2,
                    borderRadius: 2,
                    border: 2,
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? 'rgba(108,99,166,0.08)' : 'background.paper',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main' },
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
          </Box>

          <Box
            onClick={() => setUsePassword((p) => !p)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
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
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password', 'Password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                sx={{ mb: 1.5 }}
                InputProps={{
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
                size="small"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.confirmPassword', 'Confirm Password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleRegister()}
                autoComplete="new-password"
                error={confirmPassword.length > 0 && confirmPassword !== password}
              />
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => void handleRegister()}
            disabled={loading || !email}
            sx={{ mb: 2, borderRadius: 2, py: 1.5, fontWeight: 800 }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              t('auth.createAccount', 'Create Account')
            )}
          </Button>

          <Typography variant="body2" textAlign="center" color="text.secondary">
            {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link to="/auth/login" style={{ color: '#6C63A6', fontWeight: 700 }}>
              {t('auth.signIn', 'Sign in')}
            </Link>
          </Typography>
        </Paper>

        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
          display="block"
          sx={{ mt: 2 }}
        >
          ⭐ {t('auth.trustedPlatform', 'Trusted by thousands across Saudi Arabia')}
        </Typography>
      </Box>
    </Box>
  );
}
