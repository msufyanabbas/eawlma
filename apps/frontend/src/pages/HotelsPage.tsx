import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { Listing } from '@eawlma/shared-types';

import { searchApi, type FlatSearchParams } from '@/api/search.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { useSavedStore } from '@/store/saved.store';

const PAGE_SIZE = 12;

// Price-cap options for the hotel filter — labels are i18n-derived so
// the bar reads "حتى 500 ر.س" in Arabic instead of bleeding English.
const PRICE_OPTION_VALUES = ['', '500', '1000', '2500'] as const;
const PRICE_OPTION_I18N: Record<(typeof PRICE_OPTION_VALUES)[number], { key: string; fallback: string }> = {
  '': { key: 'hotels.anyPrice', fallback: 'Any price' },
  '500': { key: 'hotels.upTo500', fallback: 'Up to 500 SAR' },
  '1000': { key: 'hotels.upTo1000', fallback: 'Up to 1,000 SAR' },
  '2500': { key: 'hotels.upTo2500', fallback: 'Up to 2,500 SAR' },
};

export function HotelsPage() {
  const { t, i18n } = useTranslation();
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  const [city, setCity] = useState('');
  const [stars, setStars] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const params: FlatSearchParams = {
    rentalType: 'hotel',
    city: city || undefined,
    hotelStarRating: stars ? Number(stars) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    limit: PAGE_SIZE,
  };

  const query = useInfiniteQuery({
    queryKey: ['hotels', params],
    queryFn: ({ pageParam = 1 }) =>
      searchApi.listings({ ...params, page: pageParam as number }),
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
  });

  const listings: Listing[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void query.refetch();
  };

  return (
    <Box sx={{ pb: 8 }}>
      <Helmet>
        <title>{t('hotels.title')} — {t('app.name')}</title>
        <meta name="description" content={t('hotels.heroSubtitle')} />
      </Helmet>

      {/* Compact purple header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            🏨 {t('hotels.heroTitle')}
          </Typography>
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <TextField
              size="small"
              placeholder={t('hotels.city')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 160 }}
            />
            <TextField
              select
              size="small"
              label={t('hotels.starRating', { defaultValue: 'Star rating' })}
              value={stars}
              onChange={(e) => setStars(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 160 }}
            >
              <MenuItem value="">{t('hotels.anyRating', { defaultValue: 'Any rating' })}</MenuItem>
              {[5, 4, 3, 2, 1].map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}★ {t('hotels.andUp', { defaultValue: 'and up' })}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('hotels.priceRange', { defaultValue: 'Price range' })}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 170 }}
            >
              {PRICE_OPTION_VALUES.map((value) => {
                const meta = PRICE_OPTION_I18N[value];
                return (
                  <MenuItem key={value || 'any'} value={value}>
                    {t(meta.key, { defaultValue: meta.fallback })}
                  </MenuItem>
                );
              })}
            </TextField>
            <Button
              type="submit"
              variant="contained"
              size="small"
              sx={{
                bgcolor: 'secondary.main',
                color: 'common.white',
                fontWeight: 700,
                '&:hover': { bgcolor: 'secondary.dark' },
              }}
            >
              {t('search.applyFilters', { defaultValue: 'Search' })}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Body — pt:{4} pulls the results bar off the purple header. */}
      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, md: 6 }, pt: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: 3,
            px: 2,
            py: 1.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
              {total.toLocaleString(i18n.language)}
            </Box>{' '}
            {t('hotels.count', { defaultValue: 'hotels' })}
          </Typography>
          <Chip
            icon={<StarIcon fontSize="small" sx={{ color: '#D4A843 !important' }} />}
            label={t('search.hotel', { defaultValue: 'Hotel' })}
            color="primary"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {query.isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <SkeletonCard />
              </Grid>
            ))}
          </Grid>
        ) : listings.length === 0 ? (
          <EmptyState title={t('hotels.empty', { defaultValue: 'No hotels match your filters.' })} />
        ) : (
          <Grid container spacing={3}>
            {listings.map((l) => (
              <Grid key={l.id} item xs={12} sm={6} md={4}>
                <ListingCard
                  listing={l}
                  saved={savedIds.includes(l.id)}
                  onToggleSave={toggleSaved}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {query.hasNextPage && (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? t('common.loading') : t('common.loadMore', { defaultValue: 'Load more' })}
            </Button>
          </Stack>
        )}

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Button component={Link} to="/stays" sx={{ fontWeight: 600 }}>
            {t('hotels.allStays', { defaultValue: 'Or browse Airbnb-style stays →' })}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default HotelsPage;
