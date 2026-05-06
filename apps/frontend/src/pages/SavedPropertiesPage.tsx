import { Box, Container, Grid } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { savedApi } from '@/api/saved.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { PageHeader } from '@/components/global/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

export function SavedPropertiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const localIds = useSavedStore((s) => s.ids);
  const toggle = useSavedStore((s) => s.toggle);

  // Authenticated users get fresh server-side data (single round trip).
  // Anonymous users see whatever they've saved in localStorage — the store
  // ids array — but we can't fetch each individually here, so we just show
  // a CTA to sign in. (A nicer UX could batch /listings/:id lookups; for
  // now we keep the anonymous experience simple.)
  const savedQuery = useQuery({
    queryKey: ['saved', 'mine'],
    queryFn: () => savedApi.mine(),
    enabled: isAuthenticated,
  });

  const listings = savedQuery.data ?? [];

  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: 1440,
        mx: 'auto',
        px: { xs: 3, sm: 4, md: 6, lg: 8 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Helmet>
        <title>{t('nav.favorites')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('nav.favorites')}
        subtitle={
          isAuthenticated && listings.length > 0
            ? `${listings.length} ${t('search.results')}`
            : undefined
        }
      />

      <Box sx={{ mt: 4 }}>
        {!isAuthenticated && localIds.length === 0 ? (
          <EmptyState
            title={t('empty.noFavorites')}
            description={t('home.heroSubtitle')}
            icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
            ctaLabel={t('empty.noFavoritesCta')}
            onCta={() => navigate({ to: '/search' })}
          />
        ) : !isAuthenticated ? (
          <EmptyState
            title="Sign in to sync your favorites"
            description="Your saved listings are kept on this device. Sign in to access them across all your devices."
            ctaLabel={t('auth.login')}
            onCta={() => navigate({ to: '/auth/login' as never })}
          />
        ) : savedQuery.isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <SkeletonCard />
              </Grid>
            ))}
          </Grid>
        ) : listings.length === 0 ? (
          <EmptyState
            title={t('empty.noFavorites')}
            description={t('home.heroSubtitle')}
            icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
            ctaLabel={t('empty.noFavoritesCta')}
            onCta={() => navigate({ to: '/search' })}
          />
        ) : (
          <Grid container spacing={3}>
            {listings.map((listing) => (
              <Grid key={listing.id} item xs={12} sm={6} md={4}>
                <ListingCard listing={listing} saved onToggleSave={() => void toggle(listing.id)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}
