import { Box, Paper, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/logo.svg';

interface AuthLayoutProps {
  /** Browser tab title (full title; we don't auto-prefix the brand). */
  pageTitle: string;
  children: ReactNode;
}

/**
 * Shared shell for /auth/* routes — clean centered card on a light grey wash.
 * No hero image, no decorative blobs; just the brand mark above a single
 * elevated form pane that scales from xs through xl.
 */
export function AuthLayout({ pageTitle, children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Brand mark — centered logo + wordmark above the card. */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Stack direction="column" alignItems="center" spacing={1}>
                <Box
                  component="img"
                  src={logoUrl}
                  alt={t('app.name')}
                  sx={{ width: 56, height: 56 }}
                />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    color: 'primary.main',
                    fontFamily: 'Tajawal, "IBM Plex Sans Arabic", sans-serif',
                    lineHeight: 1,
                  }}
                >
                  {t('app.name')}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  Eawlma
                </Typography>
              </Stack>
            </Link>
          </Box>
          <Paper
            sx={{
              p: { xs: 3, sm: 3.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 16px rgba(108,99,166,0.08)',
            }}
          >
            {children}
          </Paper>
        </Box>
      </Box>
    </>
  );
}
