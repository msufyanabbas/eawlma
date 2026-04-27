import { Box, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

export function Footer() {
  const { t } = useTranslation();
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        mt: 6,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          justifyContent="space-between"
        >
          <Box sx={{ maxWidth: 320 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {t('app.name')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('app.tagline')}
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                {t('nav.search')}
              </Typography>
              <Link href="/search?type=sale" underline="hover" color="text.primary" variant="body2">
                {t('listing.forSale')}
              </Link>
              <Link href="/search?type=rent" underline="hover" color="text.primary" variant="body2">
                {t('listing.forRent')}
              </Link>
              <Link href="/agents" underline="hover" color="text.primary" variant="body2">
                {t('nav.agents')}
              </Link>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                {t('nav.profile')}
              </Typography>
              <Link href="/login" underline="hover" color="text.primary" variant="body2">
                {t('auth.login')}
              </Link>
              <Link href="/register" underline="hover" color="text.primary" variant="body2">
                {t('auth.register')}
              </Link>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {t('app.name')} — All rights reserved.
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" aria-label="Twitter / X">
              <TwitterIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Facebook">
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Instagram">
              <InstagramIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="LinkedIn">
              <LinkedInIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
