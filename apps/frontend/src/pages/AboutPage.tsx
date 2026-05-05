import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const STATS = [
  { value: '10,000+', label: 'Properties' },
  { value: '500+', label: 'Verified agents' },
  { value: '30+', label: 'Cities' },
  { value: '24/7', label: 'Support' },
];

export function AboutPage() {
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>About Eawlma — Saudi real estate marketplace</title>
      </Helmet>

      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #4A4080 100%)',
          color: 'common.white',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 8, lg: 10 } }}>
          <Typography sx={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, mb: 2 }}>
            About Eawlma
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: 720, lineHeight: 1.6 }}>
            Eawlma is the trusted real-estate marketplace of the Kingdom — connecting
            buyers, renters, and verified agents across Saudi Arabia with a faster,
            cleaner, and more transparent property experience.
          </Typography>
        </Container>
      </Box>

      {/* Mission */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 8, lg: 10 }, py: { xs: 8, md: 12 } }}>
        <Stack spacing={4} sx={{ maxWidth: 920 }}>
          <Box>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>Our mission</Typography>
            <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', lineHeight: 1.7 }}>
              We're building the most trusted property platform in Saudi Arabia by combining
              local expertise with a thoughtful product. Every listing is reviewed for
              accuracy, every agent is verified, and every conversation between a buyer
              and an agent happens in a secure, auditable channel.
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>Built for the Kingdom</Typography>
            <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', lineHeight: 1.7 }}>
              From Riyadh's Olaya district to Jeddah's Corniche and Dammam's waterfront,
              Eawlma indexes properties across Saudi Arabia's growing cities. The platform
              is fully bilingual, RTL-first, and respects PDPL data-protection requirements
              by design.
            </Typography>
          </Box>
        </Stack>
      </Container>

      {/* Stats — same 4-col glass tiles as the homepage */}
      <Box sx={{ bgcolor: '#F5F4FA', py: { xs: 8, md: 10 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 8, lg: 10 } }}>
          <Grid container spacing={{ xs: 3, md: 5 }}>
            {STATS.map((s) => (
              <Grid key={s.label} item xs={6} md={3}>
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
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Team — placeholder */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 8, lg: 10 }, py: { xs: 8, md: 12 } }}>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 1.5 }}>Our team</Typography>
        <Typography sx={{ fontSize: '1.05rem', color: 'text.secondary', maxWidth: 720, lineHeight: 1.7 }}>
          A small Riyadh-based team of engineers, designers, and real-estate professionals.
          We're hiring across product, engineering, and customer success — reach us at{' '}
          <Box component="a" href="mailto:hello@eawlma.sa" sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}>
            hello@eawlma.sa
          </Box>
          .
        </Typography>
      </Container>
    </Box>
  );
}
