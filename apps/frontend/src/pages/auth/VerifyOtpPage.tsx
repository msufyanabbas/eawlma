import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { AuthLayout } from './AuthLayout';
import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

/**
 * 6-digit OTP entry with auto-advance, paste handling, and resend countdown.
 * Verifies against `/auth/verify-otp`; on success the user is logged in. The
 * email is picked up from sessionStorage (`eawlma.prefillEmail`), which the
 * register and login flows populate before redirecting here.
 */
export function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  // RegisterPage stashes the address in sessionStorage before redirecting here.
  const [email] = useState<string>(
    () => sessionStorage.getItem('eawlma.prefillEmail') ?? '',
  );
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const focusIndex = (i: number) => {
    if (i >= 0 && i < OTP_LENGTH) refs.current[i]?.focus();
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    const next = [...digits];
    next[i] = value[value.length - 1] ?? '';
    setDigits(next);
    if (i < OTP_LENGTH - 1) focusIndex(i + 1);
  };

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focusIndex(i - 1);
    if (e.key === 'ArrowLeft' && i > 0) focusIndex(i - 1);
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) focusIndex(i + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!data) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < data.length; i++) next[i] = data[i];
    setDigits(next);
    focusIndex(Math.min(data.length, OTP_LENGTH - 1));
  };

  const code = digits.join('');
  const ready = code.length === OTP_LENGTH;

  const handleSubmit = async () => {
    if (!email) {
      setError(t('auth.emailRequired', 'Please enter your email'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.verifyOtp(email, code);
      if ('needsRegistration' in result) {
        // OTP was valid but no account exists — kick the user back to register.
        sessionStorage.setItem('eawlma.prefillEmail', result.email);
        void navigate({ to: '/auth/register' });
        return;
      }
      setSession(result.user, result.tokens);
      sessionStorage.removeItem('eawlma.prefillEmail');
      setSuccess(t('auth.loginSuccess'));
      setTimeout(() => navigate({ to: '/' }), 600);
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.invalidOtp', 'Invalid or expired code'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await authApi.sendOtp(email);
      setSecondsLeft(RESEND_SECONDS);
    } catch (e) {
      setError(extractErrorMessage(e) || t('auth.sendOtpError', 'Failed to send code, please try again'));
    }
  };

  return (
    <AuthLayout pageTitle={`${t('auth.login')} — ${t('app.name')}`}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Verify your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {email
            ? t('auth.otpSentTo', 'Verification code sent to') + ` ${email}`
            : t('auth.enterCode', 'Enter 6-digit code')}
        </Typography>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3} alignItems="center">
        <Stack direction="row" spacing={1} sx={{ direction: 'ltr' }}>
          {digits.map((value, i) => (
            <TextField
              key={i}
              inputRef={(el: HTMLInputElement | null) => {
                refs.current[i] = el;
              }}
              value={value}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              onPaste={i === 0 ? handlePaste : undefined}
              inputProps={{
                inputMode: 'numeric',
                maxLength: 1,
                autoComplete: 'one-time-code',
                style: { textAlign: 'center', fontSize: 24, fontWeight: 700, padding: 12, width: 28 },
              }}
              sx={{ width: 56 }}
            />
          ))}
        </Stack>

        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={!ready || submitting}
          onClick={handleSubmit}
        >
          {submitting ? t('common.loading') : t('common.confirm')}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          {secondsLeft > 0 ? (
            <Typography variant="body2" color="text.secondary">
              You can resend the code in {secondsLeft}s
            </Typography>
          ) : (
            <Button onClick={handleResend} variant="text" color="primary">
              Resend code
            </Button>
          )}
        </Box>
      </Stack>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Link to="/auth/login" style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
            ← {t('common.back')}
          </Typography>
        </Link>
      </Box>
    </AuthLayout>
  );
}
