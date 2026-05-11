import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined';
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { bookingsApi, type Booking, type BookingStatus } from '@/api/bookings.api';
import { reviewsApi } from '@/api/reviews.api';
import { extractErrorMessage } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_COLOR: Record<BookingStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
};

export function BookingsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'guest' | 'host'>('guest');
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);

  const guestQuery = useQuery({
    queryKey: ['bookings', 'guest'],
    queryFn: () => bookingsApi.my(),
    enabled: tab === 'guest',
  });
  const hostQuery = useQuery({
    queryKey: ['bookings', 'host'],
    queryFn: () => bookingsApi.host(),
    enabled: tab === 'host',
  });
  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const data: Booking[] = tab === 'guest' ? guestQuery.data ?? [] : hostQuery.data ?? [];
  const loading = tab === 'guest' ? guestQuery.isLoading : hostQuery.isLoading;

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('booking.myBookings')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('booking.myBookings')} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="guest" label={t('booking.tabGuest')} />
        <Tab value="host" label={t('booking.tabHost')} />
      </Tabs>

      {loading ? (
        <Box>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 2 }} />
          ))}
        </Box>
      ) : data.length === 0 ? (
        <EmptyState title={t('booking.noBookings')} />
      ) : (
        <Stack spacing={2}>
          {data.map((b) => (
            <Paper key={b.id} sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ md: 'center' }}
                spacing={1.5}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {new Date(b.checkIn).toLocaleDateString(i18n.language)} →{' '}
                    {new Date(b.checkOut).toLocaleDateString(i18n.language)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.nights} {t('booking.nights')} · {b.numGuests}{' '}
                    {t('booking.guests', { defaultValue: 'guests' })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {b.totalAmount.toLocaleString(i18n.language)} {t('listing.currency')}
                  </Typography>
                  {b.depositAmount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {t('booking.damageDeposit', { defaultValue: 'Refundable deposit' })}:{' '}
                      {b.depositAmount.toLocaleString(i18n.language)} {t('listing.currency')}
                    </Typography>
                  )}
                </Box>
                <Chip
                  size="small"
                  color={STATUS_COLOR[b.status]}
                  label={t(`booking.status.${b.status}`, { defaultValue: b.status })}
                />
                <Stack direction="row" spacing={1}>
                  {tab === 'host' && b.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => confirmMutation.mutate(b.id)}
                    >
                      {t('booking.confirm')}
                    </Button>
                  )}
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => cancelMutation.mutate(b.id)}
                    >
                      {t('booking.cancel')}
                    </Button>
                  )}
                  {tab === 'guest' &&
                    (b.status === 'confirmed' || b.status === 'completed') && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RateReviewIcon />}
                        onClick={() => setReviewTarget(b)}
                      >
                        {t('booking.leaveReview', { defaultValue: 'Leave a review' })}
                      </Button>
                    )}
                </Stack>
              </Stack>

              {/* Check-in card — visible only once the host has confirmed and
               *  only on the guest's view (booking row carries the private
               *  listing copy from the server). */}
              {tab === 'guest' && b.status === 'confirmed' && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'success.main',
                    bgcolor: 'rgba(76,175,80,0.06)',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <VpnKeyIcon color="success" fontSize="small" />
                    <Typography sx={{ fontWeight: 800, color: 'success.dark' }}>
                      🔑 {t('booking.checkInInstructions', { defaultValue: 'Check-in instructions' })}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {b.checkInInstructions ||
                      t('booking.checkInInstructionsPending', {
                        defaultValue: 'Host will send instructions 24h before check-in.',
                      })}
                  </Typography>
                </Box>
              )}
            </Paper>
          ))}
          {confirmMutation.isError && (
            <Alert severity="error">{extractErrorMessage(confirmMutation.error)}</Alert>
          )}
        </Stack>
      )}

      {!loading && data.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('booking.helpTip')}
        </Typography>
      )}

      {reviewTarget && (
        <LeaveReviewDialog
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewTarget(null);
            void qc.invalidateQueries({ queryKey: ['reviews'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ------------------------------------------------------------------
// Leave-review dialog — overall + 4 sub-ratings + free-text comment.
// ------------------------------------------------------------------

function LeaveReviewDialog({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [location, setLocation] = useState(5);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      reviewsApi.createForListing(booking.listingId, {
        rating,
        comment: comment.trim(),
        cleanlinessRating: cleanliness,
        accuracyRating: accuracy,
        communicationRating: communication,
        locationRating: location,
      }),
    onSuccess: () => onSuccess(),
  });

  const submitDisabled = mutation.isPending || comment.trim().length < 10;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('booking.leaveReview', { defaultValue: 'Leave a review' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RatingRow
            label={t('booking.overallRating', { defaultValue: 'Overall rating' })}
            value={rating}
            onChange={setRating}
          />
          <RatingRow label={t('booking.subRating.cleanliness')} value={cleanliness} onChange={setCleanliness} />
          <RatingRow label={t('booking.subRating.accuracy')} value={accuracy} onChange={setAccuracy} />
          <RatingRow label={t('booking.subRating.communication')} value={communication} onChange={setCommunication} />
          <RatingRow label={t('booking.subRating.location')} value={location} onChange={setLocation} />
          <TextField
            label={t('booking.comment', { defaultValue: 'Comment' })}
            multiline
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('booking.commentPlaceholder')}
          />
          {mutation.isError && (
            <Alert severity="error">{extractErrorMessage(mutation.error)}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          color="primary"
          disabled={submitDisabled}
          onClick={() => mutation.mutate()}
          sx={{ fontWeight: 700 }}
        >
          {mutation.isPending ? t('common.loading') : t('booking.submitReview', { defaultValue: 'Submit review' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
      <Typography variant="body2">{label}</Typography>
      <Rating
        value={value}
        onChange={(_, v) => onChange(v ?? 1)}
        size="medium"
      />
    </Stack>
  );
}
