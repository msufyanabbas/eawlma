import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface Crumb {
  label: string;
  /** When omitted the crumb renders as plain text (the current page). */
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  /** Right-side slot — typically a primary CTA button. */
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <Box>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }} aria-label="breadcrumb">
          {breadcrumbs.map((c, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            if (c.to && !isLast) {
              return (
                <MuiLink key={`${c.label}-${idx}`} component={Link} to={c.to as never} underline="hover" color="inherit" variant="body2">
                  {c.label}
                </MuiLink>
              );
            }
            return (
              <Typography key={`${c.label}-${idx}`} variant="body2" color="text.primary">
                {c.label}
              </Typography>
            );
          })}
        </Breadcrumbs>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.012em' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
