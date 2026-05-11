import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
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
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1920&q=80';

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '500', label: 'Up to 500' },
  { value: '1000', label: 'Up to 1,000' },
  { value: '2500', label: 'Up to 2,500' },
];

export function HotelsPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
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

      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 320, md: 420 },
          display: 'flex',
          alignItems: 'center',
          color: 'common.white',
          background: `linear-gradient(135deg, ${alpha('#1A1A2E', 0.78)} 0%, ${alpha('#6C63A6', 0.62)} 100%), url(${HERO_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          py: { xs: 6, md: 10 },
          mb: 4,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 } }}>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: 'clamp(2rem, 4vw, 3.25rem)', mb: 1 }}>
            {t('hotels.heroTitle')}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, mb: 4, maxWidth: 700 }}>
            {t('hotels.heroSubtitle')}
          </Typography>

          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{
              bgcolor: 'rgba(255,255,255,0.95)',
              borderRadius: { xs: 3, md: 999 },
              p: { xs: 1.5, md: 1 },
              maxWidth: 900,
              boxShadow: '0 24px 50px rgba(26,26,46,0.45)',
            }}
          >
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  variant="standard"
                  placeholder={t('hotels.city')}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  InputProps={{ disableUnderline: true, sx: { px: 1.5, color: 'text.primary' } }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  variant="standard"
                  value={stars}
                  onChange={(e) => setStars(e.target.value)}
                  InputProps={{ disableUnderline: true, sx: { px: 1.5, color: 'text.primary' } }}
                >
                  <MenuItem value="">Any rating</MenuItem>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <MenuItem key={n} value={String(n)}>{n}★ and up</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  variant="standard"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  InputProps={{ disableUnderline: true, sx: { px: 1.5, color: 'text.primary' } }}
                >
                  {PRICE_OPTIONS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ borderRadius: 999, py: 1.25, fontWeight: 700, background: theme.eawlma.gradient }}
                >
                  {t('search.applyFilters', { defaultValue: 'Search' })}
                </Button>
              </Grid>
            </Grid>
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
