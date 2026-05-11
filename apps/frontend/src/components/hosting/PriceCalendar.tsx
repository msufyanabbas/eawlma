import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pricingApi } from '@/api/pricing.api';
import { extractErrorMessage } from '@/api/client';

interface Props {
  listingId: string;
  /** Used to seed the override input field. */
  fallbackDailyRate: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmtMonth = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

/**
 * Month-grid pricing calendar. Hosts can:
 *   • shift months with the chevrons
 *   • click a single day, or shift-click to extend a multi-day selection
 *   • set / clear a price override on the selected day(s)
 *
 * Override-priced days render with a coloured chip; default-rate days show
 * the inherited price greyed out.
 */
export function PriceCalendar({ listingId, fallbackDailyRate }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthKey = fmtMonth(cursor);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceInput, setPriceInput] = useState(String(fallbackDailyRate || 0));
  const [reasonInput, setReasonInput] = useState('');

  const calendarQuery = useQuery({
    queryKey: ['pricing', listingId, monthKey],
    queryFn: () => pricingApi.calendar(listingId, monthKey),
  });

  const upsertMutation = useMutation({
    mutationFn: ({ dates, price, reason }: { dates: string[]; price: number; reason?: string }) =>
      pricingApi.upsertOverrides(listingId, dates, price, reason),
    onSuccess: () => {
      setDialogOpen(false);
      setSelected(new Set());
      setReasonInput('');
      queryClient.invalidateQueries({ queryKey: ['pricing', listingId, monthKey] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: (dates: string[]) =>
      Promise.all(dates.map((d) => pricingApi.removeOverride(listingId, d))),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['pricing', listingId, monthKey] });
    },
  });

  // Build a 6-row × 7-col grid starting on Monday.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lastOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    // Mon=0, Sun=6 — getDay returns 0=Sun..6=Sat, so we shift.
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const total = startOffset + lastOfMonth.getDate();
    const rows = Math.ceil(total / 7);
    const out: ({ date: string; day: number } | null)[] = [];
    for (let i = 0; i < rows * 7; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > lastOfMonth.getDate()) {
        out.push(null);
      } else {
        out.push({
          date: fmtDate(new Date(cursor.getFullYear(), cursor.getMonth(), dayNum)),
          day: dayNum,
        });
      }
    }
    return out;
  }, [cursor]);

  const dayMap = useMemo(() => {
    const m = new Map<string, { price: number; isOverride: boolean; reason: string | null }>();
    for (const d of calendarQuery.data?.days ?? []) {
      m.set(d.date, { price: d.price, isOverride: d.isOverride, reason: d.reason });
    }
    return m;
  }, [calendarQuery.data]);

  const shiftMonth = (delta: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    setSelected(new Set());
  };

  const toggleDay = (date: string, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && prev.size > 0) {
        // Range select: from the earliest currently-selected date to `date`.
        const all = [...prev, date].sort();
        const start = new Date(all[0]);
        const end = new Date(date);
        const [lo, hi] = start <= end ? [start, end] : [end, start];
        for (let d = new Date(lo); d <= hi; d.setDate(d.getDate() + 1)) {
          next.add(fmtDate(d));
        }
      } else if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const openEditDialog = () => {
    if (selected.size === 0) return;
    const first = [...selected].sort()[0];
    const existing = dayMap.get(first);
    setPriceInput(String(existing?.price ?? calendarQuery.data?.defaultRate ?? fallbackDailyRate));
    setReasonInput(existing?.reason ?? '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) return;
    upsertMutation.mutate({
      dates: [...selected],
      price,
      reason: reasonInput.trim() || undefined,
    });
  };

  const handleClearOverrides = () => {
    const dates = [...selected].filter((d) => dayMap.get(d)?.isOverride);
    if (dates.length === 0) return;
    clearMutation.mutate(dates);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => shiftMonth(-1)} aria-label="previous month">
          <ChevronLeftIcon
            sx={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
          />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          {cursor.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton onClick={() => shiftMonth(1)} aria-label="next month">
          <ChevronRightIcon
            sx={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
          />
        </IconButton>
      </Stack>

      {calendarQuery.isLoading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            {WEEKDAYS.map((w) => (
              <Typography
                key={w}
                variant="caption"
                sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}
              >
                {t(`weekday.${w.toLowerCase()}`, { defaultValue: w })}
              </Typography>
            ))}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
            }}
          >
            {cells.map((cell, idx) => {
              if (!cell) return <Box key={idx} sx={{ minHeight: 64 }} />;
              const data = dayMap.get(cell.date);
              const isSelected = selected.has(cell.date);
              const isOverride = data?.isOverride ?? false;
              const price = data?.price ?? calendarQuery.data?.defaultRate ?? fallbackDailyRate;
              return (
                <Box
                  key={cell.date}
                  onClick={(e) => toggleDay(cell.date, e.shiftKey)}
                  role="button"
                  tabIndex={0}
                  sx={{
                    minHeight: 64,
                    p: 0.75,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.16)
                      : isOverride
                        ? alpha(theme.palette.warning.main, 0.12)
                        : 'background.paper',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {cell.day}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isOverride ? 700 : 500,
                      color: isOverride ? 'warning.dark' : 'text.secondary',
                      fontSize: 11,
                      mt: 'auto',
                    }}
                  >
                    {Number(price).toLocaleString(i18n.language)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {selected.size > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {t('pricing.selectedCount', {
                  count: selected.size,
                  defaultValue: `${selected.size} days selected`,
                })}
              </Typography>
              <Button variant="contained" onClick={openEditDialog}>
                {t('pricing.setPrice', { defaultValue: 'Set price' })}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleClearOverrides}
                disabled={clearMutation.isPending}
              >
                {t('pricing.clearOverride', { defaultValue: 'Clear override' })}
              </Button>
              <Button onClick={() => setSelected(new Set())}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
            </Stack>
          )}

          {upsertMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {extractErrorMessage(upsertMutation.error)}
            </Alert>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {t('pricing.setPriceFor', {
            count: selected.size,
            defaultValue: `Set price for ${selected.size} day(s)`,
          })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('pricing.pricePerNight', { defaultValue: 'Price per night (SAR)' })}
              type="number"
              fullWidth
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              autoFocus
            />
            <TextField
              label={t('pricing.reasonOptional', { defaultValue: 'Reason (optional)' })}
              fullWidth
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={t('pricing.reasonPlaceholder', {
                defaultValue: 'Eid surge, off-season etc.',
              })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={upsertMutation.isPending || !priceInput.trim()}
          >
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
