import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
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

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthLayout } from '@/pages/auth/AuthLayout';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const schema = z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.required')),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values),
    onSuccess: (data) => {
      setSession(data.user, data.tokens);
      void navigate({ to: '/' });
    },
  });

  const onSubmit = (values: FormValues) => loginMutation.mutate(values);

  return (
    <AuthLayout pageTitle={`${t('auth.login')} — ${t('app.name')}`}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('auth.loginTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.loginSubtitle')}
        </Typography>
      </Box>

      {loginMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(loginMutation.error)}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? t('common.loading') : t('auth.signIn')}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" align="center" sx={{ mt: 3 }}>
        {t('auth.noAccount')}{' '}
        <MuiLink component={Link} to="/register" underline="hover" color="primary">
          {t('auth.createAccount')}
        </MuiLink>
      </Typography>
    </AuthLayout>
  );
}
