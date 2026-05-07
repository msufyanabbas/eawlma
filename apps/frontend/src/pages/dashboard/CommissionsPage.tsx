import {
  Box,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { commissionsApi, type CommissionStatus } from '@/api/commissions.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

// Lifecycle palette per the agent view spec:
//   pending   = grey  (waiting for admin confirmation)
//   confirmed = yellow (waiting for buyer payment)
//   paid      = green  (received)
//   disputed  = red    (escalation needed)
const STATUS_COLORS: Record<CommissionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#E5E7EB', text: '#374151', label: 'Pending' },
  confirmed: { bg: '#FFF3CD', text: '#856404', label: 'Confirmed' },
  paid: { bg: '#D4EDDA', text: '#155724', label: 'Paid' },
  disputed: { bg: '#F8D7DA', text: '#721C24', label: 'Disputed' },
};

export function CommissionsPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const commissionsQuery = useQuery({
    queryKey: ['commissions', 'mine'],
    queryFn: () => commissionsApi.myCommissions(),
  });

  const summary = useMemo(() => {
    const rows = commissionsQuery.data ?? [];
    const totals = rows.reduce(
      (acc, c) => {
        acc.total += c.agentCommissionAmount;
        if (c.status === 'pending' || c.status === 'confirmed') acc.pending += c.agentCommissionAmount;
        if (c.status === 'paid') acc.paid += c.agentCommissionAmount;
        return acc;
      },
      { total: 0, pending: 0, paid: 0 },
    );
    return totals;
  }, [commissionsQuery.data]);

  const fmt = (n: number) => `${n.toLocaleString(i18n.language, { maximumFractionDigits: 2 })} ${t('listing.currency')}`;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Commissions — {t('app.name')}</title>
      </Helmet>

      <PageHeader title="My commissions" subtitle="Track every commission you've earned across closed transactions." />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, background: theme.eawlma.gradient, color: 'common.white' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, opacity: 0.85, textTransform: 'uppercase' }}>
              Total earned
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5 }}>
              {commissionsQuery.isLoading ? <Skeleton width={120} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} /> : fmt(summary.total)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: 1, borderColor: 'warning.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'warning.dark', textTransform: 'uppercase' }}>
              Pending
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'warning.dark' }}>
              {commissionsQuery.isLoading ? <Skeleton width={120} /> : fmt(summary.pending)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.success.main, 0.1), border: 1, borderColor: 'success.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'success.dark', textTransform: 'uppercase' }}>
              Paid
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'success.dark' }}>
              {commissionsQuery.isLoading ? <Skeleton width={120} /> : fmt(summary.paid)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        {commissionsQuery.isLoading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (commissionsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No commissions yet"
            description="Once a listing closes, your commission will appear here with full breakdown and status."
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Listing</TableCell>
                <TableCell>Transaction value</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>You earn</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(commissionsQuery.data ?? []).map((c) => {
                const colors = STATUS_COLORS[c.status];
                const listingLabel =
                  c.listingTitle ||
                  c.listingReferenceCode ||
                  `${c.listingId.slice(0, 8)}…`;
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {listingLabel}
                      </Typography>
                      {c.listingReferenceCode && c.listingTitle && (
                        <Typography variant="caption" color="text.secondary">
                          {c.listingReferenceCode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{fmt(c.transactionValue)}</TableCell>
                    <TableCell>{c.agentCommissionRate}%</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>{fmt(c.agentCommissionAmount)}</TableCell>
                    <TableCell>
                      <Chip
                        label={colors.label}
                        size="small"
                        sx={{ bgcolor: colors.bg, color: colors.text, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="baseline">
                        <Typography variant="body2">{new Date(c.createdAt).toLocaleDateString(i18n.language)}</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </DashboardLayout>
  );
}
