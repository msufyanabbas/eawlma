import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { bookingsApi } from '@/api/bookings.api';
import { extractErrorMessage } from '@/api/client';
import { GA } from '@/utils/analytics';

interface CallbackSearch {
  bookingId?: string;
  status?: string;
  id?: string; // Moyasar appends `id` for the payment id
  payment_id?: string;
  mock?: string;
  promoCode?: string;
}

/**
 * Landing page Moyasar (or the dev-mock URL) redirects to after the user
 * completes a payment attempt. We forward the status + paymentId back to the
 * backend so it can flip the booking status, then bounce the user into their
 * booking history.
 */
export function BookingPaymentCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as CallbackSearch;
  const [resolved, setResolved] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!search.bookingId || !search.status) {
        setError('Missing payment callback parameters');
        return;
      }
      try {
        const result = await bookingsApi.confirmPayment(
          search.bookingId,
          search.status,
          search.payment_id ?? search.id,
          search.promoCode,
        );
        if (cancelled) return;
        if (result.status === 'cancelled' || result.status === 'failed') {
          setResolved('failed');
        } else {
          setResolved('paid');
          // GA4 conversion — best-effort, doesn't block redirect.
          GA.completeBooking(result.bookingId, 0);
          setTimeout(() => {
            if (!cancelled) navigate({ to: '/dashboard/bookings' as never });
          }, 2200);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [search.bookingId, search.status, search.payment_id, search.id, search.promoCode, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Helmet>
        <title>{t('booking.paymentCallback', { defaultValue: 'Payment status' })} — {t('app.name')}</title>
      </Helmet>
      <Stack spacing={3} alignItems="center" sx={{ maxWidth: 480, textAlign: 'center' }}>
        {error ? (
          <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
        ) : resolved === 'pending' ? (
          <>
            <CircularProgress size={56} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('booking.processingPayment', { defaultValue: 'Confirming your payment…' })}
            </Typography>
          </>
        ) : resolved === 'paid' ? (
          <>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {t('booking.confirmedTitle', { defaultValue: 'Booking confirmed!' })} 🎉
            </Typography>
            <Typography color="text.secondary">
              {t('booking.redirectingBookings', {
                defaultValue: 'Redirecting you to your bookings…',
              })}
            </Typography>
          </>
        ) : (
          <>
            <CancelIcon sx={{ fontSize: 80, color: 'error.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {t('booking.paymentFailed', { defaultValue: 'Payment failed' })}
            </Typography>
            <Typography color="text.secondary">
              {t('booking.paymentFailedDesc', {
                defaultValue: 'No charge was made. You can try again with a different card.',
              })}
            </Typography>
            <Button variant="contained" onClick={() => window.history.back()}>
              {t('booking.tryAgain', { defaultValue: 'Try again' })}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default BookingPaymentCallbackPage;
