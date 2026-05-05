import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
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
 * two-pane layout on desktop with a luxury Saudi villa image (Ken Burns
 * zoom) on the inline-start side carrying the value proposition.
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
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Ken-Burns background — slow infinite zoom + drift */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${AUTH_HERO_IMAGE})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                animation: 'kenBurns 20s ease-in-out infinite alternate',
                '@keyframes kenBurns': {
                  '0%':   { transform: 'scale(1) translate(0, 0)' },
                  '100%': { transform: 'scale(1.12) translate(-1.5%, -1%)' },
                },
              }}
            />
            {/* Dark gradient overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to bottom, rgba(15,10,40,0.5) 0%, rgba(108,99,166,0.7) 100%)',
              }}
            />

            {/* Logo top-start, larger */}
            <Box sx={{ position: 'relative', py: 4, px: 4 }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Stack direction="row" alignItems="center" spacing={1.75}>
                  <Box
                    component="img"
                    src={logoUrl}
                    alt={t('app.name')}
                    sx={{
                      width: 52,
                      height: 52,
                      filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.4))',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: 'common.white',
                      letterSpacing: '-0.5px',
                      textShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
              spacing={1.75}
            >
              <Typography
                lang="ar"
                dir="rtl"
                sx={{
                  fontFamily: 'Tajawal, "IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(2rem, 3vw, 3rem)',
                  lineHeight: 1.2,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
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

            {/* Glass stats bar with icons */}
            <Box sx={{ position: 'relative', p: 4 }}>
              <Stack
                direction="row"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 3,
                  px: 1.5,
                  py: 2,
                }}
                divider={
                  <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.22)', mx: 1 }} />
                }
              >
                <IconStat icon={<HomeIcon />} label="10,000+" sub="Properties" />
                <IconStat icon={<PersonIcon />} label="500+" sub={t('nav.agents')} />
                <IconStat icon={<PlaceIcon />} label="30+" sub="Cities" />
              </Stack>
            </Box>
          </Box>
        )}

        {/* Form pane — subtle lavender-tinted gradient + corner brand pattern */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 4, md: 6 },
            background: 'linear-gradient(160deg, #FAFAF8 0%, #F0EEF8 100%)',
            // Decorative corner cluster — 3 lavender circles at varying opacity
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 32,
              insetInlineEnd: 32,
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'rgba(108,99,166,0.45)',
              boxShadow:
                '20px 12px 0 0 rgba(108,99,166,0.28), 44px -4px 0 0 rgba(108,99,166,0.18), 8px 28px 0 0 rgba(108,99,166,0.12)',
              pointerEvents: 'none',
            },
          }}
        >
          <Container maxWidth="sm" sx={{ position: 'relative' }}>
            <Paper
              sx={{
                p: { xs: 3, sm: 5 },
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                boxShadow: '0 24px 48px rgba(108,99,166,0.16)',
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

function IconStat({ icon, label, sub }: { icon: ReactNode; label: string; sub: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, justifyContent: 'center' }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.16)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          '& svg': { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            opacity: 0.85,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: '#FFFFFF',
          }}
        >
          {sub}
        </Typography>
      </Box>
    </Stack>
  );
}
