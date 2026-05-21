import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface RTLChartProps {
  children: ReactNode;
  height?: number;
}

/**
 * Wrapper that keeps Recharts in LTR mode — the library does not lay out
 * categorical axes / legends correctly under `dir="rtl"`, so the chart itself
 * must stay LTR even when the surrounding page is RTL. Pair it with
 * `useChartTranslations` for localized labels and RTL-aware data ordering.
 */
export default function RTLChart({ children, height = 300 }: RTLChartProps) {
  return (
    <Box sx={{ direction: 'ltr', width: '100%', height }}>
      {children}
    </Box>
  );
}
