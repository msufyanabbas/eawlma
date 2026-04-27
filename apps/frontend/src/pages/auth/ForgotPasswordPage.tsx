import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/MarkEmailRead';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { AuthLayout } from './AuthLayout';

/**
 * Forgot-password flow. Backend `/auth/forgot-password` is planned but not
 * yet implemented; this page submits to a stub that always resolves so the
 * UX can be validated end-to-end.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const schema = z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const onSubmit = async () => {
    // Stub: simulate a request. Replace with a real auth.api.forgotPassword
    // call once the backend endpoint exists.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitted(true);
  };

  return (
    <AuthLayout pageTitle={`${t('auth.forgotPassword')} — ${t('app.name')}`}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t('auth.forgotPassword')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your email and we'll send you a reset link.
        </Typography>
      </Box>

      {submitted ? (
        <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'success.light',
              color: 'success.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EmailIcon fontSize="large" />
          </Box>
          <Alert severity="success" sx={{ width: '100%' }}>
            If an account exists for that email, we've sent a reset link.
            Check your inbox (and spam folder) within the next few minutes.
          </Alert>
          <MuiLink component={Link} to="/auth/login" underline="hover" color="primary" variant="body2">
            ← {t('auth.signIn')}
          </MuiLink>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('common.confirm')}
            </Button>
          </Stack>

          <Typography variant="body2" align="center" sx={{ mt: 4 }}>
            <MuiLink component={Link} to="/auth/login" underline="hover" color="primary">
              ← {t('auth.signIn')}
            </MuiLink>
          </Typography>
        </Box>
      )}
    </AuthLayout>
  );
}
