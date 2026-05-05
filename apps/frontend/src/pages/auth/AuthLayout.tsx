import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
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

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80';

/**
 * Shared shell for /auth/* routes. Renders a centered card on mobile and a
 * two-pane layout on desktop with a luxury Saudi heritage palace image on
 * the inline-start side carrying the value proposition.
 */
export function AuthLayout({ pageTitle, children }: AuthLayoutProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          bgcolor: 'background.default',
        }}
      >
        {isDesktop && (
          <Box
            sx={{
              flex: '0 0 44%',
              position: 'relative',
              color: 'common.white',
              overflow: 'hidden',
              backgroundImage: `url(${AUTH_HERO_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Dark gradient overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to bottom, rgba(15,10,40,0.5) 0%, rgba(108,99,166,0.7) 100%)',
              }}
            />

            {/* Logo top-start */}
            <Box sx={{ position: 'relative', p: 5, pb: 0 }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    component="img"
                    src={logoUrl}
                    alt={t('app.name')}
                    sx={{
                      width: 44,
                      height: 44,
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
                    }}
                  />
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: 'common.white',
                      letterSpacing: -0.5,
                    }}
                  >
                    {t('app.name')}
                  </Typography>
                </Stack>
              </Link>
            </Box>

            {/* Centered headline */}
            <Stack
              sx={{
                position: 'relative',
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                px: 5,
              }}
              spacing={1.5}
            >
              <Typography
                lang="ar"
                dir="rtl"
                sx={{
                  fontFamily: '"IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: { md: '2.4rem', lg: '2.9rem' },
                  lineHeight: 1.2,
                  textShadow: '0 2px 18px rgba(0,0,0,0.35)',
                }}
              >
                اكتشف منزل أحلامك
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  opacity: 0.92,
                  fontWeight: 500,
                  letterSpacing: -0.3,
                  textShadow: '0 1px 12px rgba(0,0,0,0.35)',
                }}
              >
                Discover Your Dream Home
              </Typography>
            </Stack>

            {/* Glass stats bar at bottom */}
            <Box sx={{ position: 'relative', p: 4 }}>
              <Stack
                direction="row"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 3,
                  px: 2,
                  py: 2,
                }}
                divider={
                  <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.22)', mx: 1 }} />
                }
              >
                <Stat label="10,000+" sub="Properties" />
                <Stat label="500+" sub={t('nav.agents')} />
                <Stat label="30+" sub="Cities" />
              </Stack>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 4, md: 6 },
          }}
        >
          <Container maxWidth="sm">
            <Paper
              sx={{
                p: { xs: 3, sm: 5 },
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
              }}
            >
              {children}
            </Paper>
          </Container>
        </Box>
      </Box>
    </>
  );
}

function Stat({ label, sub }: { label: string; sub: string }) {
  return (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: 'common.white', lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          opacity: 0.85,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'common.white',
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
}
