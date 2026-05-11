import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { bookingsApi, type Booking } from '@/api/bookings.api';
import { promosApi, type ValidatePromoResult } from '@/api/promos.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  listingId: string;
  dailyRate: number;
  weeklyRate?: number | null;
  minimumStay?: number;
  maxGuests?: number | null;
  damageDeposit?: number | null;
  currencyLabel: string;
}

const SERVICE_FEE_RATE = 0.05;

/**
 * Booking widget. Pulls the listing's existing pending/confirmed bookings so
 * we can refuse overlapping date ranges client-side and show a friendly
 * "Selected dates overlap an existing booking" warning before the user
 * submits. The full month-grid calendar with per-day disabling is deferred —
 * `<input type="date">` doesn't expose a hook for that natively.
 */
export function BookingCalendar({
  listingId,
  dailyRate,
  weeklyRate,
  minimumStay = 1,
  maxGuests,
  damageDeposit,
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
  const [numGuests, setNumGuests] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<ValidatePromoResult | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Existing pending/confirmed bookings — used to disable overlapping ranges.
  const availabilityQuery = useQuery({
    queryKey: ['bookings', 'availability', listingId],
    queryFn: () => bookingsApi.availability(listingId),
    staleTime: 60_000,
  });
  const booked: Booking[] = availabilityQuery.data ?? [];

  const nights = useMemo(() => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (Number.isNaN(ci.getTime()) || Number.isNaN(co.getTime())) return 0;
    return Math.max(0, Math.round((co.getTime() - ci.getTime()) / (24 * 3600 * 1000)));
  }, [checkIn, checkOut]);

  /** True when [checkIn, checkOut) overlaps any pending/confirmed booking. */
  const overlapsBooked = useMemo(() => {
    if (!nights) return false;
    const ci = new Date(checkIn).getTime();
    const co = new Date(checkOut).getTime();
    return booked.some((b) => {
      const bIn = new Date(b.checkIn).getTime();
      const bOut = new Date(b.checkOut).getTime();
      return bIn < co && bOut > ci;
    });
  }, [booked, checkIn, checkOut, nights]);

  // Price breakdown matches the backend `calculateStayTotal` exactly.
  const breakdown = useMemo(() => {
    if (!nights) {
      return {
        baseRate: 0,
        discount: 0,
        discountAmount: 0,
        subtotal: 0,
        platformFee: 0,
        deposit: 0,
        total: 0,
      };
    }
    let subtotal: number;
    let discount = 0;
    const baseRate = nights * dailyRate;
    if (nights >= 30) {
      discount = 0.2;
      subtotal = baseRate * 0.8;
    } else if (nights >= 7) {
      if (weeklyRate && weeklyRate > 0) {
        const weeks = Math.floor(nights / 7);
        const extra = nights % 7;
        subtotal = weeks * weeklyRate + extra * dailyRate;
        // Effective discount vs. straight nightly — for display purposes.
        if (baseRate > 0) discount = Math.max(0, 1 - subtotal / baseRate);
      } else {
        discount = 0.1;
        subtotal = baseRate * 0.9;
      }
    } else {
      subtotal = baseRate;
    }
    const discountAmount = baseRate - subtotal;
    const platformFee = subtotal * SERVICE_FEE_RATE;
    const deposit = damageDeposit ?? 0;
    const total = subtotal + platformFee + deposit;
    return { baseRate, discount, discountAmount, subtotal, platformFee, deposit, total };
  }, [nights, dailyRate, weeklyRate, damageDeposit]);

  const handleBook = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await bookingsApi.create({
        listingId,
        checkIn,
        checkOut,
        numGuests,
        promoCode: promoApplied?.valid ? promoApplied.code : undefined,
      });
      // Redirect to Moyasar's hosted payment page (or the dev-mock callback).
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      // Fallback if no payment URL was returned (shouldn't happen in practice).
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoApply = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setPromoChecking(true);
    setPromoError(null);
    try {
      const result = await promosApi.validate(code, breakdown.subtotal, listingId);
      if (result.valid) {
        setPromoApplied(result);
        setPromoError(null);
      } else {
        setPromoApplied(null);
        setPromoError(result.message);
      }
    } catch (err) {
      setPromoApplied(null);
      setPromoError(extractErrorMessage(err));
    } finally {
      setPromoChecking(false);
    }
  };

  const handlePromoClear = () => {
    setPromoCode('');
    setPromoApplied(null);
    setPromoError(null);
  };

  const lang = i18n.language;
  const fmt = (n: number) => `${n.toLocaleString(lang, { maximumFractionDigits: 0 })} ${currencyLabel}`;
  const disabled =
    nights < minimumStay ||
    overlapsBooked ||
    submitting ||
    (maxGuests ? numGuests > maxGuests : false);

  return (
    <Box>
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('booking.success')}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {dailyRate.toLocaleString(lang)} {currencyLabel}{' '}
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

          {maxGuests ? (
            <TextField
              type="number"
              label={t('booking.guests', { defaultValue: 'Guests' })}
              value={numGuests}
              onChange={(e) => setNumGuests(Math.max(1, Number(e.target.value) || 1))}
              inputProps={{ min: 1, max: maxGuests }}
              helperText={t('booking.maxGuests', { defaultValue: 'Max guests' }) + `: ${maxGuests}`}
            />
          ) : null}

          {/* Booked-dates warning — friendlier than letting the server reject */}
          {overlapsBooked && (
            <Alert severity="warning">
              {t('booking.datesUnavailable', {
                defaultValue: 'Selected dates overlap an existing booking.',
              })}
            </Alert>
          )}

          {/* Promo code input — validates against the running subtotal so the
           *  discount line in the breakdown updates immediately. */}
          {nights > 0 && (
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('promo.codePlaceholder', { defaultValue: 'Promo code' })}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={promoChecking || !!promoApplied}
              />
              {promoApplied ? (
                <Button variant="outlined" onClick={handlePromoClear} disabled={submitting}>
                  {t('common.remove', { defaultValue: 'Remove' })}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={handlePromoApply}
                  disabled={promoChecking || !promoCode.trim()}
                >
                  {promoChecking
                    ? t('promo.checking', { defaultValue: 'Checking…' })
                    : t('promo.apply', { defaultValue: 'Apply' })}
                </Button>
              )}
            </Stack>
          )}
          {promoError && <Alert severity="warning">{promoError}</Alert>}
          {promoApplied?.valid && (
            <Alert severity="success">{promoApplied.message}</Alert>
          )}

          {/* Price breakdown */}
          {nights > 0 && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {t('booking.priceBreakdown', { defaultValue: 'Price breakdown' })}
              </Typography>

              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    {dailyRate.toLocaleString(lang)} {currencyLabel} × {nights}{' '}
                    {t('booking.nights')}
                  </Typography>
                  <Typography variant="body2">{fmt(breakdown.baseRate)}</Typography>
                </Stack>

                {breakdown.discountAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'success.main' }}>
                    <Typography variant="body2">
                      {nights >= 30
                        ? t('booking.monthlyDiscount', { defaultValue: 'Monthly discount' })
                        : t('booking.weeklyDiscount', { defaultValue: 'Weekly discount' })}
                    </Typography>
                    <Typography variant="body2">−{fmt(breakdown.discountAmount)}</Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    {t('booking.serviceFee', { defaultValue: 'Service fee' })} (5%)
                  </Typography>
                  <Typography variant="body2">{fmt(breakdown.platformFee)}</Typography>
                </Stack>

                {breakdown.deposit > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2">
                        {t('booking.damageDeposit', { defaultValue: 'Refundable deposit' })}
                      </Typography>
                      <Tooltip
                        title={t('booking.depositTooltip', {
                          defaultValue: 'Returned within 24h after checkout',
                        })}
                      >
                        <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </Tooltip>
                    </Stack>
                    <Typography variant="body2">{fmt(breakdown.deposit)}</Typography>
                  </Stack>
                )}
              </Stack>

              {promoApplied?.valid && promoApplied.discount > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: 'success.main' }}>
                  <Typography variant="body2">
                    {t('promo.discount', { defaultValue: 'Promo' })} ({promoApplied.code})
                  </Typography>
                  <Typography variant="body2">−{fmt(promoApplied.discount)}</Typography>
                </Stack>
              )}

              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800 }}>
                  {t('booking.total', { defaultValue: 'Total' })}
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {fmt(Math.max(0, breakdown.total - (promoApplied?.valid ? promoApplied.discount : 0)))}
                </Typography>
              </Stack>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {isAuthenticated ? (
            <Button
              variant="contained"
              size="large"
              disabled={disabled}
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
