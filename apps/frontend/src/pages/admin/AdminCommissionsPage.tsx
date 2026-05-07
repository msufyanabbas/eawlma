import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { commissionsApi, type Commission, type CommissionStatus } from '@/api/commissions.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_COLORS: Record<CommissionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FFF3CD', text: '#856404', label: 'Pending' },
  confirmed: { bg: '#CCE5FF', text: '#004085', label: 'Confirmed' },
  paid: { bg: '#D4EDDA', text: '#155724', label: 'Paid' },
  disputed: { bg: '#F8D7DA', text: '#721C24', label: 'Disputed' },
};

const STATUS_OPTIONS: CommissionStatus[] = ['pending', 'confirmed', 'paid', 'disputed'];

export function AdminCommissionsPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  const summaryQuery = useQuery({
    queryKey: ['commissions', 'admin-summary'],
    queryFn: () => commissionsApi.adminSummary(),
  });
  const allQuery = useQuery({
    queryKey: ['commissions', 'admin-all'],
    queryFn: () => commissionsApi.adminAll(),
  });

  const commissions = allQuery.data ?? [];
  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? commissions
        : commissions.filter((c) => c.status === statusFilter),
    [commissions, statusFilter],
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommissionStatus }) =>
      commissionsApi.adminUpdateStatus(id, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  const fmt = (n: number) =>
    `${n.toLocaleString(i18n.language, { maximumFractionDigits: 2 })} ${t('listing.currency')}`;

  const exportCsv = () => {
    const headers = ['ID', 'Listing', 'Agent', 'Buyer', 'Value', 'Agent rate', 'Platform rate', 'Agent earn', 'Platform earn', 'Status', 'Created'];
    const rows = filtered.map((c: Commission) => [
      c.id,
      c.listingId,
      c.agentId,
      c.buyerId ?? '',
      c.transactionValue,
      c.agentCommissionRate,
      c.platformCommissionRate,
      c.agentCommissionAmount,
      c.platformCommissionAmount,
      c.status,
      c.createdAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Commissions — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title="Platform commissions"
        subtitle="Total revenue, agent payouts, and per-transaction breakdown."
        action={
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      {/* Summary cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, background: theme.eawlma.gradient, color: 'common.white' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, opacity: 0.85, textTransform: 'uppercase' }}>
              Platform revenue
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5 }}>
              {summaryQuery.isLoading ? <Skeleton width={140} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} /> : fmt(summaryQuery.data?.totalPlatformRevenue ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.success.main, 0.1), border: 1, borderColor: 'success.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'success.dark', textTransform: 'uppercase' }}>
              Agent commissions
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'success.dark' }}>
              {summaryQuery.isLoading ? <Skeleton width={140} /> : fmt(summaryQuery.data?.totalAgentCommissions ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.08), border: 1, borderColor: alpha(theme.palette.primary.main, 0.25) }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'primary.dark', textTransform: 'uppercase' }}>
              Transactions
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'primary.dark' }}>
              {summaryQuery.isLoading ? <Skeleton width={80} /> : (summaryQuery.data?.totalTransactions ?? 0).toLocaleString(i18n.language)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Monthly chart */}
      <Paper sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 2 }}>Revenue by month</Typography>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryQuery.data?.byMonth ?? []}>
              <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={theme.palette.text.secondary} fontSize={12} />
              <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="platform" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
              <Bar dataKey="agent" fill={theme.palette.success.main} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 800 }}>All commissions</Typography>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{STATUS_COLORS[s].label}</MenuItem>
            ))}
          </TextField>
        </Stack>
        {allQuery.isLoading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <EmptyState title="No commissions" description="Try a different status filter." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Listing</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Buyer</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Platform earn</TableCell>
                <TableCell>Agent earn</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Closed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => {
                const colors = STATUS_COLORS[c.status];
                const listingLabel =
                  c.listingTitle ||
                  c.listingReferenceCode ||
                  `${c.listingId.slice(0, 8)}…`;
                const agentLabel = c.agentName || `${c.agentId.slice(0, 8)}…`;
                const buyerLabel = c.buyerName || (c.buyerId ? `${c.buyerId.slice(0, 8)}…` : '—');
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
                    <TableCell>{agentLabel}</TableCell>
                    <TableCell>{buyerLabel}</TableCell>
                    <TableCell>{fmt(c.transactionValue)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmt(c.platformCommissionAmount)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmt(c.agentCommissionAmount)}</TableCell>
                    <TableCell>
                      <Chip label={colors.label} size="small" sx={{ bgcolor: colors.bg, color: colors.text, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.createdAt).toLocaleDateString(i18n.language)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {c.status === 'pending' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: c.id, status: 'confirmed' })
                            }
                            sx={{ fontWeight: 700 }}
                          >
                            Confirm
                          </Button>
                        )}
                        <TextField
                          select
                          size="small"
                          value={c.status}
                          onChange={(e) => updateMutation.mutate({ id: c.id, status: e.target.value as CommissionStatus })}
                          sx={{ minWidth: 140 }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <MenuItem key={s} value={s}>{STATUS_COLORS[s].label}</MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}
