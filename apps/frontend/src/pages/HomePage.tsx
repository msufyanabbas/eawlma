import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('app.name')} — {t('app.tagline')}</title>
        <meta name="description" content={t('app.tagline')} />
      </Helmet>

      <Container maxWidth="lg">
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          sx={{
            py: { xs: 6, md: 12 },
            textAlign: 'center',
            background:
              'radial-gradient(80% 60% at 50% 0%, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 60%)',
            borderRadius: 4,
            mb: 6,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '3.25rem' },
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            {t('home.heroTitle')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 720, mx: 'auto' }}>
            {t('home.heroSubtitle')}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary" size="large">
                {t('auth.createAccount')}
              </Button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="primary" size="large">
                {t('auth.login')}
              </Button>
            </Link>
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <FeatureCard title={t('home.exploreSale')} accent="primary" />
          <FeatureCard title={t('home.exploreRent')} accent="secondary" />
        </Stack>
      </Container>
    </>
  );
}

function FeatureCard({ title, accent }: { title: string; accent: 'primary' | 'secondary' }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 4,
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        transition: 'transform 200ms, box-shadow 200ms',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <Typography variant="h5" color={`${accent}.main`} sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Coming soon — full search, map view, and listing detail pages.
      </Typography>
    </Box>
  );
}
