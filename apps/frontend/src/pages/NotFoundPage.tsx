import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 6, md: 12 }, textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontSize: { xs: '4rem', md: '6rem' }, fontWeight: 800, color: 'primary.main' }}>
          404
        </Typography>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          {t('errors.notFound')}
        </Typography>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="contained" color="primary" size="large">
            {t('nav.home')}
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
