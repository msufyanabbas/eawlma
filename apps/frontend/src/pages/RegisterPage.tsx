import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { UserRole } from '@eawlma/shared-types';

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthLayout } from '@/pages/auth/AuthLayout';

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const schema = z
    .object({
      firstName: z.string().min(1, t('validation.required')).max(100),
      lastName: z.string().min(1, t('validation.required')).max(100),
      email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
      phone: z
        .string()
        .min(1, t('validation.required'))
        .regex(/^\+?[1-9]\d{7,14}$/, t('validation.phoneInvalid')),
      password: z
        .string()
        .min(8, t('validation.passwordMin', { min: 8 }))
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, t('validation.passwordWeak')),
      confirmPassword: z.string(),
      role: z.nativeEnum(UserRole),
    })
    .refine((d) => d.password === d.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordsMismatch'),
    });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: UserRole.USER,
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        role: values.role,
        preferredLocale: i18n.language,
      }),
    onSuccess: (data) => {
      setSession(data.user, data.tokens);
      void navigate({ to: '/' });
    },
  });

  const onSubmit = (values: FormValues) => registerMutation.mutate(values);

  return (
    <AuthLayout pageTitle={`${t('auth.register')} — ${t('app.name')}`}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('auth.registerTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.registerSubtitle')}
        </Typography>
      </Box>

      {registerMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(registerMutation.error)}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('auth.firstName')}
                  autoComplete="given-name"
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
                <TextField
                  label={t('auth.lastName')}
                  autoComplete="family-name"
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Stack>

              <TextField
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                label={t('auth.phone')}
                type="tel"
                placeholder="+9665XXXXXXXX"
                autoComplete="tel"
                {...register('phone')}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />

              <TextField
                label={t('auth.password')}
                type="password"
                autoComplete="new-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              <TextField
                label={t('auth.confirmPassword')}
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />

              <TextField
                select
                label={t('auth.iAmA')}
                defaultValue={UserRole.USER}
                {...register('role')}
                error={!!errors.role}
                helperText={errors.role?.message}
              >
                <MenuItem value={UserRole.USER}>{t('auth.roleUser')}</MenuItem>
                <MenuItem value={UserRole.AGENT}>{t('auth.roleAgent')}</MenuItem>
              </TextField>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? t('common.loading') : t('auth.signUp')}
              </Button>

          <Typography variant="caption" color="text.secondary" align="center">
            {t('auth.agreeTerms')}
          </Typography>
        </Stack>
      </Box>

      <Typography variant="body2" align="center" sx={{ mt: 3 }}>
        {t('auth.hasAccount')}{' '}
        <MuiLink component={Link} to="/login" underline="hover" color="primary">
          {t('auth.signIn')}
        </MuiLink>
      </Typography>
    </AuthLayout>
  );
}
