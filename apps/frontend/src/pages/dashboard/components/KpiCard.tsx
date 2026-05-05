import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

export type KpiTone = 'listings' | 'views' | 'inquiries' | 'messages';

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

const TONE_GRADIENTS: Record<KpiTone, string> = {
  listings:  'linear-gradient(135deg, #6C63A6 0%, #4A4080 100%)',
  views:     'linear-gradient(135deg, #2BBFBF 0%, #1A9090 100%)',
  inquiries: 'linear-gradient(135deg, #D4A843 0%, #B8902E 100%)',
  messages:  'linear-gradient(135deg, #10B981 0%, #0D9268 100%)',
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
  const trendColor = trend === 'up' ? 'rgba(255,255,255,0.95)' : trend === 'down' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)';

  const numericValue = typeof value === 'number' ? value : Number(value);
  const isNumeric = !loading && Number.isFinite(numericValue);

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: TONE_GRADIENTS[tone],
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(26,26,46,0.18)',
        border: 'none',
      }}
    >
      {/* Top-end icon */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          insetInlineEnd: 16,
          color: '#FFFFFF',
          opacity: 0.85,
          '& svg': { fontSize: 32 },
        }}
      >
        {icon}
      </Box>

      <Stack spacing={1}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.05, color: '#FFFFFF' }}>
          {loading ? (
            <Skeleton width={96} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} />
          ) : isNumeric ? (
            <Counter value={numericValue} />
          ) : (
            value
          )}
        </Typography>
        {trend && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TrendIcon sx={{ color: trendColor, fontSize: 18 }} />
            <Typography sx={{ color: trendColor, fontWeight: 700, fontSize: '0.875rem' }}>
              {Math.abs(trendPct ?? 0).toFixed(1)}%
            </Typography>
            {trendLabel && (
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>
                {trendLabel}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
