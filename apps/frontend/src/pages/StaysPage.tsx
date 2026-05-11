import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
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

const STAY_PROPERTY_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'entire_home', label: 'Entire home' },
  { value: 'room', label: 'Private room' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'rest_house', label: 'Rest house' },
  { value: 'farm', label: 'Farm' },
];

export function StaysPage() {
  const { t, i18n } = useTranslation();
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [flexibleDates, setFlexibleDates] = useState<boolean>(false);
  const [flexibleDuration, setFlexibleDuration] = useState<'1' | '3' | '7' | '14' | '30'>('7');

  const params: FlatSearchParams = {
    rentalType: 'short_term',
    city: city || undefined,
    checkIn: flexibleDates ? undefined : checkIn || undefined,
    checkOut: flexibleDates ? undefined : checkOut || undefined,
    minGuests: guests ? Number(guests) : undefined,
    propertyTypes: propertyType ? [propertyType] : undefined,
    flexibleDates: flexibleDates || undefined,
    minStay: flexibleDates ? Number(flexibleDuration) : undefined,
    limit: PAGE_SIZE,
  };

  const query = useInfiniteQuery({
    queryKey: ['stays', params],
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
        <title>{t('stays.title')} — {t('app.name')}</title>
        <meta name="description" content={t('stays.heroSubtitle')} />
      </Helmet>

      {/* Compact purple header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            🏖️ {t('stays.heroTitle')}
          </Typography>
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <TextField
              size="small"
              placeholder={t('stays.city')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 160 }}
            />
            <TextField
              size="small"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <TextField
              size="small"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
            />
            <TextField
              size="small"
              type="number"
              placeholder={t('stays.guests')}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, width: 90 }}
            />
            <TextField
              select
              size="small"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 140 }}
            >
              {STAY_PROPERTY_TYPES.map((p) => (
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
            <FormControlLabel
              control={
                <Switch
                  checked={flexibleDates}
                  onChange={(e) => setFlexibleDates(e.target.checked)}
                  size="small"
                  sx={{ '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.4)' } }}
                />
              }
              label={
                <Typography sx={{ color: 'common.white', fontWeight: 600, fontSize: '0.8rem' }}>
                  {t('search.flexibleDates', { defaultValue: "I'm flexible with dates" })}
                </Typography>
              }
              sx={{ ml: 1 }}
            />
            {flexibleDates && (
              <Stack direction="row" flexWrap="wrap" rowGap={1} columnGap={1}>
                {(['1', '3', '7', '14', '30'] as const).map((v) => {
                  const label =
                    v === '30'
                      ? t('search.flex1Month', { defaultValue: '1 month' })
                      : `${v} ${t('booking.nights')}`;
                  const on = flexibleDuration === v;
                  return (
                    <Chip
                      key={v}
                      size="small"
                      label={label}
                      onClick={() => setFlexibleDuration(v)}
                      sx={{
                        bgcolor: on ? 'background.paper' : 'rgba(255,255,255,0.12)',
                        color: on ? 'text.primary' : 'common.white',
                        fontWeight: 700,
                        border: `1px solid ${on ? 'transparent' : 'rgba(255,255,255,0.4)'}`,
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {total.toLocaleString(i18n.language)} {t('stays.count', { defaultValue: 'stays available' })}
          </Typography>
          <Chip label={t('search.shortTerm', { defaultValue: 'Short-term' })} color="primary" sx={{ fontWeight: 700 }} />
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
          <EmptyState title={t('stays.empty', { defaultValue: 'No stays match your filters yet.' })} />
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
          <Button component={Link} to="/search" sx={{ fontWeight: 600 }}>
            {t('stays.allListings', { defaultValue: 'Browse all listings →' })}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default StaysPage;
