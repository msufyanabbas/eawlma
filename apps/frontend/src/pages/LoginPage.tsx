import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

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
    <>
      <Helmet>
        <title>{t('auth.login')} — {t('app.name')}</title>
      </Helmet>
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, sm: 5 }, mt: { xs: 4, sm: 8 }, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
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
            <Stack spacing={2.5}>
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

          <Typography variant="body2" align="center" sx={{ mt: 4 }}>
            {t('auth.noAccount')}{' '}
            <MuiLink component={Link} to="/register" underline="hover" color="primary">
              {t('auth.createAccount')}
            </MuiLink>
          </Typography>
        </Paper>
      </Container>
    </>
  );
}
