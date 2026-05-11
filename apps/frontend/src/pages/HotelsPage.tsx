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

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '500', label: 'Up to 500' },
  { value: '1000', label: 'Up to 1,000' },
  { value: '2500', label: 'Up to 2,500' },
];

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
              value={stars}
              onChange={(e) => setStars(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 140 }}
            >
              <MenuItem value="">Any rating</MenuItem>
              {[5, 4, 3, 2, 1].map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}★ and up
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 140 }}
            >
              {PRICE_OPTIONS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
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

      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {total.toLocaleString(i18n.language)} {t('hotels.count', { defaultValue: 'hotels' })}
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
