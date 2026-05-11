import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

export type KpiTone = 'listings' | 'views' | 'inquiries' | 'messages' | 'plan' | 'conversion';

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** Visual tone — drives the gradient background. */
  tone?: KpiTone;
  /** Optional trend percentage; positive = up, negative = down. */
  trendPct?: number;
  /** Optional secondary line (e.g. "vs. last 30d"). */
  trendLabel?: string;
  loading?: boolean;
}

// Solid accent colours per tone — surface a thin coloured left border on each
// tile so the row reads at a glance without leaning on heavy gradients.
const TONE_COLORS: Record<KpiTone, string> = {
  listings:   '#6C63A6',
  views:      '#5B72A6',
  inquiries:  '#7B63A6',
  messages:   '#6380A6',
  plan:       '#8B63A6',
  conversion: '#638CA6',
};

/** Smoothly counts from 0 to `value` over 1.2s. Falls back to the raw string
 *  if the prop isn't numeric (e.g. "—" for the loading row). */
function Counter({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [motionValue, rounded, value]);
  return <motion.span>{display.toLocaleString()}</motion.span>;
}

/**
 * Reusable KPI tile used across the agent dashboard. Pairs a tinted icon with
 * a big number and an optional trend indicator (▲ green / ▼ red / – grey).
 *
 * The card uses a tone-based gradient background and renders the value via
 * an animated 0→N counter when given a numeric value.
 */
export function KpiCard({
  label,
  value,
  icon,
  tone = 'listings',
  trendPct,
  trendLabel,
  loading,
}: KpiCardProps) {
  const trend =
    typeof trendPct === 'number'
      ? trendPct > 0
        ? ('up' as const)
        : trendPct < 0
          ? ('down' as const)
          : ('flat' as const)
      : null;
  const TrendIcon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : TrendingFlatIcon;
  const trendColor = trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary';

  const numericValue = typeof value === 'number' ? value : Number(value);
  const isNumeric = !loading && Number.isFinite(numericValue);
  const toneColor = TONE_COLORS[tone];

  return (
    <Paper
      sx={{
        p: 2,
        minHeight: 130,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: toneColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Watermark icon — sits bottom-right at low opacity. */}
      <Box
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 8,
          color: toneColor,
          opacity: 0.08,
          pointerEvents: 'none',
          '& svg': { fontSize: '3.5rem' },
        }}
      >
        {icon}
      </Box>

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 1,
          display: 'block',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '2rem',
          fontWeight: 900,
          lineHeight: 1,
          color: 'text.primary',
          mt: 'auto',
          direction: 'ltr',
          unicodeBidi: 'embed',
        }}
      >
        {loading ? (
          <Skeleton width={96} />
        ) : isNumeric ? (
          <Counter value={numericValue} />
        ) : (
          value
        )}
      </Typography>
      {trend && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          <TrendIcon sx={{ color: trendColor, fontSize: 18 }} />
          <Typography sx={{ color: trendColor, fontWeight: 700, fontSize: '0.875rem' }}>
            {Math.abs(trendPct ?? 0).toFixed(1)}%
          </Typography>
          {trendLabel && (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
              {trendLabel}
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  );
}
