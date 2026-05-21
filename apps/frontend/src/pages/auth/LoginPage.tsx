import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import type { AuthResponse } from '@eawlma/shared-types';

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { GA } from '@/utils/analytics';
import { AuthLanguageSwitcher } from '@/components/auth/AuthLanguageSwitcher';

type LoginMode = 'otp' | 'password';
type OtpStep = 'email' | 'code';

const RTL_LANGS = ['ar', 'ur', 'fa', 'he'];
/** Bright luxury-property photo for the branding panel. */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80';

/**
 * Split-layout sign-in page: a branded property-photo panel on the left
 * (md+ only) and the auth form on the right. Two ways in — an emailed
 * 6-digit code (default) or the classic email + password — plus Nafath SSO.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const loadPreferencesFromBackend = useUiStore((s) => s.loadFromBackend);
  const isRTL = RTL_LANGS.includes(i18n.language);

  const [mode, setMode] = useState<LoginMode>('otp');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Self-cleaning resend timer — recreates a 1s timeout until it hits zero,
  // and tears the pending timeout down if the page unmounts mid-count.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  /** Shared post-login tail: persist the session, sync prefs, route home. */
  const finishLogin = async (auth: AuthResponse, method: string) => {
    setSession(auth.user, auth.tokens);
    await loadPreferencesFromBackend();
    const savedLang = localStorage.getItem('eawlma.locale');
    if (savedLang && i18n.language !== savedLang) {
      await i18n.changeLanguage(savedLang);
    }
    GA.login(method);
    void navigate({ to: '/' });
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired', 'Please enter your email'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.sendOtp(email.trim());
      setOtpStep('code');
      setCountdown(60);
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.sendOtpError', 'Failed to send code, please try again'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t('auth.invalidOtp', 'Invalid or expired code'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authApi.verifyOtp(email.trim(), otp.trim());
      if ('needsRegistration' in result) {
        // Hand the verified email to the registration form.
        sessionStorage.setItem('eawlma.prefillEmail', result.email);
        void navigate({ to: '/auth/register' });
        return;
      }
      await finishLogin(result, 'otp');
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.invalidOtp', 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authApi.login({ email: email.trim(), password });
      await finishLogin(result, 'password');
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.invalidCredentials', 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleNafathLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://192.168.1.125:3000/api/v1';
    window.location.href = `${apiUrl}/auth/nafath/authorize`;
  };

  const handleGoogleLogin = () => {
    // Google OAuth isn't wired to a backend endpoint yet — keep the button
    // live but tell the user instead of bouncing them to a dead route.
    setError('');
    setNotice(t('auth.googleComingSoon', 'Google sign-in is coming soon'));
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError('');
    setNotice('');
    setOtpStep('email');
    setOtp('');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', direction: isRTL ? 'rtl' : 'ltr' }}>
      <Helmet>
        <title>{`${t('auth.login')} — ${t('app.name')}`}</title>
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
            {t('auth.welcomeBack', 'Welcome back')} 👋
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {t('auth.loginSubtitle', 'Sign in to your account to continue')}
          </Typography>

          <Tabs
            value={mode}
            onChange={(_, v) => switchMode(v as LoginMode)}
            sx={{ mb: 3, '& .MuiTabs-indicator': { height: 3, borderRadius: 2 } }}
          >
            <Tab
              value="otp"
              label={t('auth.emailCode', 'Email Code')}
              icon={<Email fontSize="small" />}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab
              value="password"
              label={t('auth.password', 'Password')}
              icon={<Lock fontSize="small" />}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {notice && (
            <Alert severity="info" sx={{ mb: 3 }} onClose={() => setNotice('')}>
              {notice}
            </Alert>
          )}

          {mode === 'otp' && (
            <Stack spacing={2}>
              {otpStep === 'email' ? (
                <>
                  <TextField
                    fullWidth
                    label={t('auth.email', 'Email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSendOtp()}
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
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => void handleSendOtp()}
                    disabled={loading}
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
                  >
                    {loading ? <CircularProgress size={24} /> : t('auth.sendCode', 'Send Verification Code')}
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="success" icon={<CheckCircle />}>
                    {t('auth.otpSentTo', 'Verification code sent to')} <strong>{email}</strong>
                  </Alert>
                  <TextField
                    fullWidth
                    label={t('auth.enterCode', 'Enter 6-digit code')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && void handleVerifyOtp()}
                    autoFocus
                    inputProps={{
                      maxLength: 6,
                      inputMode: 'numeric',
                      style: {
                        letterSpacing: '0.5em',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        fontWeight: 700,
                      },
                    }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => void handleVerifyOtp()}
                    disabled={loading || otp.length !== 6}
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
                  >
                    {loading ? <CircularProgress size={24} /> : t('auth.verifyCode', 'Verify & Sign In')}
                  </Button>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Button
                      startIcon={isRTL ? <ArrowForward /> : <ArrowBack />}
                      onClick={() => {
                        setOtpStep('email');
                        setOtp('');
                        setError('');
                      }}
                    >
                      {t('common.back', 'Back')}
                    </Button>
                    <Button disabled={countdown > 0 || loading} onClick={() => void handleSendOtp()}>
                      {countdown > 0
                        ? `${t('auth.resendIn', 'Resend in')} ${countdown}s`
                        : t('auth.resendCode', 'Resend code')}
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          )}

          {mode === 'password' && (
            <Stack spacing={2}>
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
                label={t('auth.password', 'Password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handlePasswordLogin()}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
              <Box sx={{ textAlign: 'end' }}>
                <Link
                  to="/auth/forgot-password"
                  style={{ color: '#6C63A6', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  {t('auth.forgotPassword', 'Forgot password?')}
                </Link>
              </Box>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => void handlePasswordLogin()}
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
              >
                {loading ? <CircularProgress size={24} /> : t('auth.signIn', 'Sign In')}
              </Button>
            </Stack>
          )}

          <Divider sx={{ my: 3 }}>{t('common.or', 'or')}</Divider>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ py: 1.25, borderRadius: 3, fontWeight: 700, color: 'text.primary', borderColor: 'divider' }}
            >
              {t('auth.signInWithGoogle')}
            </Button>
            {/* Nafath SSO — Saudi national digital identity. Hands off to the
             *  backend authorize endpoint, which bounces through Absher. */}
            <Button
              variant="outlined"
              fullWidth
              onClick={handleNafathLogin}
              sx={{
                py: 1.25,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: '#009639',
                color: '#009639',
                fontWeight: 700,
                '&:hover': { borderWidth: 2, borderColor: '#007A2E', bgcolor: 'rgba(0,150,57,0.04)' },
              }}
            >
              {t('nafath.loginWith', 'Login with Nafath')}
            </Button>
          </Stack>

          <Typography align="center" color="text.secondary" sx={{ mt: 3 }}>
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link to="/auth/register" style={{ color: '#6C63A6', fontWeight: 700 }}>
              {t('auth.register', 'Register')}
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
