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

interface AuthLayoutProps {
  /** Browser tab title (full title; we don't auto-prefix the brand). */
  pageTitle: string;
  children: ReactNode;
}

/**
 * Shared shell for /auth/* routes. Renders a centered card on mobile and a
 * two-pane layout on desktop with a brand-gradient sidebar on the left/right
 * (direction-aware) carrying the value proposition. Children are rendered
 * inside the form pane.
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
              p: 6,
              color: 'common.white',
              overflow: 'hidden',
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, #2563EB 100%)`,
            }}
          >
            {/* Decorative orbs */}
            <Box
              sx={{
                position: 'absolute',
                width: 380,
                height: 380,
                borderRadius: '50%',
                top: -120,
                insetInlineEnd: -120,
                background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 280,
                height: 280,
                borderRadius: '50%',
                bottom: -60,
                insetInlineStart: -80,
                background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)',
              }}
            />
            <Stack sx={{ position: 'relative', height: '100%' }} spacing={4}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    A
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'common.white' }}>
                    {t('app.name')}
                  </Typography>
                </Stack>
              </Link>

              <Box sx={{ mt: 'auto', maxWidth: 460 }}>
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}
                >
                  {t('app.tagline')}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                  {t('home.heroSubtitle')}
                </Typography>
              </Box>

              <Stack direction="row" spacing={4} sx={{ pt: 2 }}>
                <Stat label="10,000+" sub={t('nav.search')} />
                <Stat label="500+" sub={t('nav.agents')} />
                <Stat label="30+" sub={t('common.language')} />
              </Stack>
            </Stack>
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
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'common.white' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.85, textTransform: 'uppercase' }}>
        {sub}
      </Typography>
    </Box>
  );
}
