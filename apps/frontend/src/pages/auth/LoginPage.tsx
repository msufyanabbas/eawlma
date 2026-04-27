import {
  Alert,
  Box,
  Button,
  Divider,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { authApi } from '@/api/auth.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthLayout } from './AuthLayout';

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
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
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
          <Box sx={{ textAlign: 'end' }}>
            <MuiLink
              component={Link}
              to="/auth/forgot-password"
              underline="hover"
              variant="body2"
              color="primary"
            >
              {t('auth.forgotPassword')}
            </MuiLink>
          </Box>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? t('common.loading') : t('auth.signIn')}
          </Button>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              {t('common.more')}
            </Typography>
          </Divider>

          {/* Google OAuth — UI only; backend integration is a follow-up. */}
          <Button variant="outlined" color="inherit" startIcon={<GoogleIcon />} disabled>
            Google
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" align="center" sx={{ mt: 4 }}>
        {t('auth.noAccount')}{' '}
        <MuiLink component={Link} to="/auth/register" underline="hover" color="primary">
          {t('auth.createAccount')}
        </MuiLink>
      </Typography>
    </AuthLayout>
  );
}
