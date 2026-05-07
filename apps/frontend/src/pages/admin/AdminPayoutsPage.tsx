import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { payoutsApi, type PayoutRequest, type PayoutStatus } from '@/api/payouts.api';
import { extractErrorMessage } from '@/api/client';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_COLORS: Record<PayoutStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#E5E7EB', text: '#374151', label: 'Pending' },
  processing: { bg: '#CCE5FF', text: '#004085', label: 'Processing' },
  paid: { bg: '#D4EDDA', text: '#155724', label: 'Paid' },
  failed: { bg: '#F8D7DA', text: '#721C24', label: 'Failed' },
  rejected: { bg: '#F8D7DA', text: '#721C24', label: 'Rejected' },
};

const STATUS_OPTIONS: PayoutStatus[] = ['pending', 'processing', 'paid', 'failed', 'rejected'];

export function AdminPayoutsPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [rejectFor, setRejectFor] = useState<PayoutRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['payouts', 'admin-summary'],
    queryFn: () => payoutsApi.adminSummary(),
  });
  const allQuery = useQuery({
    queryKey: ['payouts', 'admin-all', statusFilter],
    queryFn: () => payoutsApi.adminAll(statusFilter === 'all' ? undefined : statusFilter),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      payoutsApi.adminReject(id, { reason }),
    onSuccess: () => {
      setRejectFor(null);
      setRejectReason('');
      void qc.invalidateQueries({ queryKey: ['payouts'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (p: PayoutRequest) =>
      payoutsApi.request({
        amount: p.amount,
        ibanNumber: p.ibanNumber,
        bankName: p.bankName,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payouts'] });
    },
  });

  const rows = allQuery.data ?? [];
  const filtered = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const fmt = (n: number) =>
    `${n.toLocaleString(i18n.language, { maximumFractionDigits: 2 })} ${t('listing.currency')}`;

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.payouts')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('admin.payouts')}
        subtitle={t('admin.payoutsSubtitle')}
      />

      {/* Summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, background: theme.eawlma.gradient, color: 'common.white' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, opacity: 0.85, textTransform: 'uppercase' }}>
              {t('admin.totalPaidOut')}
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5 }}>
              {summaryQuery.isLoading ? <Skeleton width={140} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} /> : fmt(summaryQuery.data?.totalPaid ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.info.main, 0.08), border: 1, borderColor: 'info.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'info.dark', textTransform: 'uppercase' }}>
              {t('admin.totalPending')}
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'info.dark' }}>
              {summaryQuery.isLoading ? <Skeleton width={140} /> : fmt(summaryQuery.data?.totalProcessing ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.error.main, 0.08), border: 1, borderColor: 'error.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'error.dark', textTransform: 'uppercase' }}>
              {t('admin.failedCount')}
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.5, color: 'error.dark' }}>
              {summaryQuery.isLoading
                ? <Skeleton width={80} />
                : ((summaryQuery.data?.countByStatus.failed ?? 0) + (summaryQuery.data?.countByStatus.rejected ?? 0)).toLocaleString(i18n.language)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Table */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 800 }}>{t('admin.allPayouts')}</Typography>
          <TextField
            select
            size="small"
            label={t('common.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">{t('common.viewAll')}</MenuItem>
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
          <EmptyState title={t('admin.noPayouts')} description={t('admin.noPayoutsBody')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.agent')}</TableCell>
                <TableCell align="right">{t('common.amount')}</TableCell>
                <TableCell>{t('wallet.ibanNumber')}</TableCell>
                <TableCell>{t('wallet.bankName')}</TableCell>
                <TableCell>{t('admin.requested')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('admin.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((p) => {
                const palette = STATUS_COLORS[p.status];
                const maskedIban =
                  p.ibanNumber.length > 8
                    ? `${p.ibanNumber.slice(0, 4)}…${p.ibanNumber.slice(-4)}`
                    : p.ibanNumber;
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.agentName || `${p.agentId.slice(0, 8)}…`}
                      </Typography>
                      {p.agentEmail && (
                        <Typography variant="caption" color="text.secondary">
                          {p.agentEmail}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(p.amount)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{maskedIban}</TableCell>
                    <TableCell>{p.bankName}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(p.requestedAt).toLocaleString(i18n.language)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={palette.label} size="small" sx={{ bgcolor: palette.bg, color: palette.text, fontWeight: 700 }} />
                      {p.failureReason && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25, maxWidth: 240 }}>
                          {p.failureReason}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {(p.status === 'pending' || p.status === 'processing') && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={rejectMutation.isPending}
                            onClick={() => {
                              setRejectFor(p);
                              setRejectReason('');
                            }}
                          >
                            {t('admin.reject')}
                          </Button>
                        )}
                        {p.status === 'failed' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(p)}
                            sx={{ fontWeight: 700 }}
                          >
                            {t('admin.retry')}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Reject dialog */}
      <Dialog open={Boolean(rejectFor)} onClose={() => setRejectFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin.rejectPayout')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.rejectPayoutBody')}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              required
              label={t('admin.rejectionReason')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {rejectMutation.isError && (
              <Alert severity="error">{extractErrorMessage(rejectMutation.error)}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectFor(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            onClick={() =>
              rejectFor &&
              rejectMutation.mutate({ id: rejectFor.id, reason: rejectReason.trim() })
            }
            sx={{ fontWeight: 700, color: 'common.white' }}
          >
            {rejectMutation.isPending ? t('common.loading') : t('admin.reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
