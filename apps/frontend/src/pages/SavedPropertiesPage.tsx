import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '@/api/listings.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { PageHeader } from '@/components/global/PageHeader';
import { useSavedStore } from '@/store/saved.store';

export function SavedPropertiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ids, toggle } = useSavedStore();

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['listings', id],
      queryFn: () => listingsApi.getById(id),
      staleTime: 60_000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const listings = queries.map((q) => q.data).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Helmet>
        <title>{t('nav.favorites')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('nav.favorites')}
        subtitle={ids.length > 0 ? `${ids.length} ${t('search.results')}` : undefined}
      />

      <Box sx={{ mt: 4 }}>
        {ids.length === 0 ? (
          <EmptyState
            title={t('empty.noFavorites')}
            description={t('home.heroSubtitle')}
            icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
            ctaLabel={t('empty.noFavoritesCta')}
            onCta={() => navigate({ to: '/search' as never })}
          />
        ) : isLoading && listings.length === 0 ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <SkeletonCard />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {listings.map((listing) => (
              <Grid key={listing.id} item xs={12} sm={6} md={4}>
                <ListingCard listing={listing} saved onToggleSave={toggle} />
              </Grid>
            ))}
            {/* Mix in skeletons while remaining cards still resolve */}
            {isLoading && (
              <>
                <Grid item xs={12} sm={6} md={4}><SkeletonCard /></Grid>
                <Grid item xs={12} sm={6} md={4}><SkeletonCard /></Grid>
              </>
            )}
          </Grid>
        )}
      </Box>
    </Container>
  );
}
