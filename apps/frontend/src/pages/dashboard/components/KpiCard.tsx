import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  /** Color key from MUI palette (primary | secondary | success | …). */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  /** Optional trend percentage; positive = up, negative = down. */
  trendPct?: number;
  /** Optional secondary line (e.g. "vs. last 30d"). */
  trendLabel?: string;
  loading?: boolean;
}

/**
 * Reusable KPI tile used across the agent dashboard. Pairs a tinted icon with
 * a big number and an optional trend indicator (▲ green / ▼ red / – grey).
 */
export function KpiCard({
  label,
  value,
  icon,
  color = 'primary',
  trendPct,
  trendLabel,
  loading,
}: KpiCardProps) {
  const theme = useTheme();
  const palette = theme.palette[color];
  const trend =
    typeof trendPct === 'number'
      ? trendPct > 0
        ? ('up' as const)
        : trendPct < 0
          ? ('down' as const)
          : ('flat' as const)
      : null;
  const trendColor = trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary';
  const TrendIcon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : TrendingFlatIcon;

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: palette.main,
            bgcolor: alpha(palette.main, 0.12),
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {loading ? <Skeleton width={64} /> : value}
          </Typography>
          {trend && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              <TrendIcon sx={{ color: trendColor, fontSize: 16 }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                {Math.abs(trendPct ?? 0).toFixed(1)}%
              </Typography>
              {trendLabel && (
                <Typography variant="caption" color="text.secondary">
                  {trendLabel}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
