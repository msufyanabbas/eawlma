import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { alpha } from '@mui/material/styles';

interface EmptyStateProps {
  /** Heading text. */
  title: string;
  /** Sub-copy under the title. */
  description?: string;
  /** Optional icon — falls back to a soft circle. */
  icon?: ReactNode;
  /** Optional CTA button label. */
  ctaLabel?: string;
  onCta?: () => void;
  /** Slot for extra content under the CTA. */
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  ctaLabel,
  onCta,
  children,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0)} 70%)`,
          color: 'primary.main',
        }}
      >
        {icon ?? (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.18),
            }}
          />
        )}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          {description}
        </Typography>
      )}
      {ctaLabel && onCta && (
        <Button variant="contained" color="primary" size="large" onClick={onCta} sx={{ mt: 1 }}>
          {ctaLabel}
        </Button>
      )}
      {children}
    </Stack>
  );
}
