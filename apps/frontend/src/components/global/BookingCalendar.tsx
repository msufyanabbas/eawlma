import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { bookingsApi } from '@/api/bookings.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  listingId: string;
  dailyRate: number;
  minimumStay?: number;
  currencyLabel: string;
}

/**
 * Lightweight booking widget — date-input pickers plus a live nights/total
 * calculation. Falls back to a "sign in to book" CTA for guests. The full
 * Airbnb-style calendar with disabled days is intentionally deferred (see
 * `bookings.availability` endpoint, which already returns booked ranges).
 */
export function BookingCalendar({
  listingId,
  dailyRate,
  minimumStay = 1,
  currencyLabel,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const today = new Date().toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState<string>(today);
  const [checkOut, setCheckOut] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, minimumStay));
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nights = useMemo(() => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (Number.isNaN(ci.getTime()) || Number.isNaN(co.getTime())) return 0;
    return Math.max(0, Math.round((co.getTime() - ci.getTime()) / (24 * 3600 * 1000)));
  }, [checkIn, checkOut]);
  const total = nights * dailyRate;

  const handleBook = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await bookingsApi.create({ listingId, checkIn, checkOut });
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('booking.success')}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {dailyRate.toLocaleString(i18n.language)} {currencyLabel}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              / {t('booking.night')}
            </Typography>
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              type="date"
              label={t('booking.checkIn')}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: today }}
            />
            <TextField
              fullWidth
              type="date"
              label={t('booking.checkOut')}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: checkIn }}
            />
          </Stack>

          <Box
            sx={{
              p: 1.5,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {nights} {t('booking.nights')}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              {total.toLocaleString(i18n.language)} {currencyLabel}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {isAuthenticated ? (
            <Button
              variant="contained"
              size="large"
              disabled={nights < minimumStay || submitting}
              onClick={handleBook}
              sx={{ fontWeight: 700 }}
            >
              {t('booking.bookNow')}
            </Button>
          ) : (
            <Alert severity="info">{t('booking.signInRequired')}</Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}
