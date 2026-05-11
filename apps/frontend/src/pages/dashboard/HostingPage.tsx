import {
  Alert,
  Box,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import StarIcon from '@mui/icons-material/Star';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { SHORT_TERM_PROPERTY_TYPES, type Listing } from '@eawlma/shared-types';

import { listingsApi } from '@/api/listings.api';
import { bookingsApi, type Booking } from '@/api/bookings.api';
import { reviewsApi } from '@/api/reviews.api';
import { extractErrorMessage } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { PriceCalendar } from '@/components/hosting/PriceCalendar';

const STATUS_COLORS: Record<Booking['status'], { bg: string; text: string; label: string }> = {
  pending: { bg: '#FFF3CD', text: '#856404', label: 'Pending' },
  confirmed: { bg: '#D4EDDA', text: '#155724', label: 'Confirmed' },
  cancelled: { bg: '#F8D7DA', text: '#721C24', label: 'Cancelled' },
  completed: { bg: '#CCE5FF', text: '#004085', label: 'Completed' },
};

export function HostingPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Hosting only matters for short-term listings the host owns.
  const listingsQuery = useQuery({
    queryKey: ['listings', 'mine-hosting'],
    queryFn: () => listingsApi.mine({ page: 1, limit: 100 }),
  });
  const shortTermListings = useMemo(
    () =>
      (listingsQuery.data?.data ?? []).filter((l) =>
        SHORT_TERM_PROPERTY_TYPES.includes(l.propertyType),
      ),
    [listingsQuery.data],
  );

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'host'],
    queryFn: () => bookingsApi.host(),
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'mine', user?.id],
    queryFn: () => reviewsApi.forAgent(user!.id, 1, 10),
    enabled: !!user,
  });

  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const selectedListing =
    shortTermListings.find((l) => l.id === selectedListingId) ?? shortTermListings[0];

  const instantBookMutation = useMutation({
    mutationFn: ({ id, instantBook }: { id: string; instantBook: boolean }) =>
      listingsApi.update(id, { shortTerm: { instantBook } } as never),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listings', 'mine-hosting'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'host'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'host'] }),
  });

  // Filter bookings to the active short-term listing when one is chosen.
  const bookings = useMemo(() => {
    const all = bookingsQuery.data ?? [];
    if (!selectedListing) return all;
    return all.filter((b) => b.listingId === selectedListing.id);
  }, [bookingsQuery.data, selectedListing]);

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('hosting.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('hosting.title')}
        subtitle={t('hosting.subtitle')}
      />

      {/* Listing picker */}
      <Paper sx={{ p: 2.5 }}>
        {listingsQuery.isLoading ? (
          <Skeleton variant="rectangular" height={56} />
        ) : shortTermListings.length === 0 ? (
          <Alert severity="info">{t('hosting.noShortTerm')}</Alert>
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('hosting.activeListing')}
                value={selectedListing?.id ?? ''}
                onChange={(e) => setSelectedListingId(e.target.value)}
              >
                {shortTermListings.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {selectedListing && (
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end">
                  <FlashOnIcon color={(selectedListing as Listing).instantBook ? 'warning' : 'disabled'} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('hosting.instantBook')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('hosting.instantBookHint')}
                    </Typography>
                  </Box>
                  <Switch
                    checked={!!(selectedListing as Listing).instantBook}
                    disabled={instantBookMutation.isPending}
                    onChange={(e) =>
                      instantBookMutation.mutate({
                        id: selectedListing.id,
                        instantBook: e.target.checked,
                      })
                    }
                  />
                </Stack>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* Bookings calendar — simplified upcoming list. The full month view is
       *  intentionally deferred until we wire react-big-calendar. */}
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <EventAvailableIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t('hosting.upcomingBookings')}
          </Typography>
        </Stack>

        {bookingsQuery.isLoading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : bookings.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {t('hosting.noBookings')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('booking.checkIn')}</TableCell>
                <TableCell>{t('booking.checkOut')}</TableCell>
                <TableCell>{t('booking.nights', { defaultValue: 'Nights' })}</TableCell>
                <TableCell>{t('stays.guests')}</TableCell>
                <TableCell>{t('hosting.amount')}</TableCell>
                <TableCell>{t('hosting.status')}</TableCell>
                <TableCell align="right">{t('hosting.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((b) => {
                const palette = STATUS_COLORS[b.status];
                return (
                  <TableRow key={b.id} hover>
                    <TableCell>{new Date(b.checkIn).toLocaleDateString(i18n.language)}</TableCell>
                    <TableCell>{new Date(b.checkOut).toLocaleDateString(i18n.language)}</TableCell>
                    <TableCell>{b.nights}</TableCell>
                    <TableCell>{b.numGuests}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {Number(b.totalAmount).toLocaleString(i18n.language)} SAR
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={palette.label}
                        sx={{ bgcolor: palette.bg, color: palette.text, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {b.status === 'pending' && (
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                          <button
                            type="button"
                            onClick={() => confirmMutation.mutate(b.id)}
                            style={{
                              padding: '4px 10px',
                              border: 'none',
                              borderRadius: 6,
                              background: theme.palette.success.main,
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            {t('hosting.confirm', { defaultValue: 'Confirm' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelMutation.mutate(b.id)}
                            style={{
                              padding: '4px 10px',
                              border: '1px solid',
                              borderColor: theme.palette.error.main,
                              borderRadius: 6,
                              background: 'transparent',
                              color: theme.palette.error.main,
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {confirmMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>{extractErrorMessage(confirmMutation.error)}</Alert>
        )}
      </Paper>

      {/* Pricing-by-date — dynamic calendar with per-day overrides. Daily &
       *  weekly rate cards on top, override grid below. */}
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          {t('hosting.pricingByDate')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('hosting.pricingHint')}
        </Typography>
        {selectedListing && (
          <>
            <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1.5} sx={{ mb: 3 }}>
              <Box sx={{ flex: '1 1 200px', minWidth: 200, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary">{t('hosting.dailyRate')}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {Number(
                    (selectedListing as unknown as { dailyRate?: number }).dailyRate ?? selectedListing.price,
                  ).toLocaleString(i18n.language)} SAR
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary">{t('hosting.weeklyRate')}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {(selectedListing as unknown as { weeklyRate?: number | null }).weeklyRate
                    ? `${Number((selectedListing as unknown as { weeklyRate?: number }).weeklyRate).toLocaleString(i18n.language)} SAR`
                    : '—'}
                </Typography>
              </Box>
            </Stack>
            <PriceCalendar
              listingId={selectedListing.id}
              fallbackDailyRate={Number(
                (selectedListing as unknown as { dailyRate?: number }).dailyRate ??
                  selectedListing.price ??
                  0,
              )}
            />
          </>
        )}
      </Paper>

      {/* Guest reviews */}
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <StarIcon sx={{ color: theme.eawlma.gold }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t('hosting.guestReviews')}
          </Typography>
        </Stack>

        {reviewsQuery.isLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : !reviewsQuery.data?.reviews?.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {t('hosting.noReviews')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {reviewsQuery.data.reviews.slice(0, 5).map((r) => (
              <Box key={r.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box sx={{ color: theme.eawlma.gold, letterSpacing: 1 }}>
                    {'★'.repeat(r.rating)}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {r.reviewer
                      ? `${r.reviewer.firstName} ${r.reviewer.lastName}`.trim()
                      : 'Guest'}{' '}
                    · {new Date(r.createdAt).toLocaleDateString(i18n.language)}
                  </Typography>
                </Stack>
                <Typography variant="body2">{r.comment}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </DashboardLayout>
  );
}

export default HostingPage;
