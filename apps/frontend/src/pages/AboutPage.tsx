import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const STATS_KEYS: Array<{ value: string; key: string }> = [
  { value: '10,000+', key: 'about.stats.properties' },
  { value: '500+',    key: 'about.stats.agents' },
  { value: '30+',     key: 'about.stats.cities' },
  { value: '24/7',    key: 'about.stats.support' },
];

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>{t('about.title')} — {t('app.name')}</title>
      </Helmet>

      {/* Compact purple header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            🏢 {t('about.title')}
          </Typography>
          <Typography sx={{ opacity: 0.85, fontSize: '0.95rem', maxWidth: 720 }}>
            {t('about.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Mission */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 8, md: 12 } }}>
        <Stack spacing={4} sx={{ maxWidth: 920 }}>
          <Box>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>
              {t('about.missionTitle')}
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', lineHeight: 1.7 }}>
              {t('about.missionBody')}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>
              {t('about.kingdomTitle')}
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', lineHeight: 1.7 }}>
              {t('about.kingdomBody')}
            </Typography>
          </Box>
        </Stack>
      </Container>

      {/* Stats — same 4-col glass tiles as the homepage */}
      <Box sx={{ bgcolor: '#F5F4FA', py: { xs: 8, md: 10 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 } }}>
          <Grid container spacing={{ xs: 3, md: 5 }}>
            {STATS_KEYS.map((s) => (
              <Grid key={s.key} item xs={6} md={3}>
                <Box
                  sx={{
                    bgcolor: 'rgba(108,99,166,0.08)',
                    border: '1px solid rgba(108,99,166,0.15)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 3,
                    px: { xs: 2, md: 3 },
                    py: { xs: 2, md: 3 },
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t(s.key)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Team — placeholder */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 8, md: 12 } }}>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>
          {t('about.teamTitle')}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', maxWidth: 720, lineHeight: 1.7 }}>
          {t('about.teamBody')}{' '}
          <Box component="a" href="mailto:hello@eawlma.sa" sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}>
            hello@eawlma.sa
          </Box>
          .
        </Typography>
      </Container>
    </Box>
  );
}
