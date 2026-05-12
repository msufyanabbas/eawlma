import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import type { DealStatus, Inquiry } from '@eawlma/shared-types';

import { inquiriesApi } from '@/api/inquiries.api';
import { listingsApi } from '@/api/listings.api';
import { extractErrorMessage } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';

const DEAL_STATUS_COLORS: Record<DealStatus, { bg: string; text: string; labelKey: string }> = {
  none: { bg: '#E0E0E0', text: '#333', labelKey: 'buyerDeals.dealStatus.none' },
  pending_confirmation: { bg: '#FFF3CD', text: '#856404', labelKey: 'buyerDeals.dealStatus.pending_confirmation' },
  confirmed: { bg: '#D4EDDA', text: '#155724', labelKey: 'buyerDeals.dealStatus.confirmed' },
  disputed: { bg: '#F8D7DA', text: '#721C24', labelKey: 'buyerDeals.dealStatus.disputed' },
  resolved: { bg: '#CCE5FF', text: '#004085', labelKey: 'buyerDeals.dealStatus.resolved' },
};

const DISPUTE_REASONS = [
  'not_finalized',
  'wrong_amount',
  'did_not_agree',
  'other',
] as const;

export function BuyerDealsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const inquiriesQuery = useQuery({
    queryKey: ['inquiries', 'mine-sent', 'deals'],
    queryFn: () => inquiriesApi.mineSent({ page: 1, limit: 100 }),
  });

  // Only inquiries the agent has actually flagged a close on — anything else
  // is irrelevant on the "My Deals" page.
  const deals = useMemo(
    () => (inquiriesQuery.data?.data ?? []).filter((i) => i.dealClosedByAgent),
    [inquiriesQuery.data],
  );

  const [confirmTarget, setConfirmTarget] = useState<Inquiry | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<Inquiry | null>(null);

  const confirmMutation = useMutation({
    mutationFn: (id: string) => inquiriesApi.confirmDeal(id),
    onSuccess: () => {
      setConfirmTarget(null);
      void qc.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('buyerDeals.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('buyerDeals.title')} subtitle={t('buyerDeals.subtitle')} />

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('buyerDeals.listing')}</TableCell>
              <TableCell>{t('buyerDeals.amount')}</TableCell>
              <TableCell>{t('buyerDeals.closedAt')}</TableCell>
              <TableCell>{t('buyerDeals.status')}</TableCell>
              <TableCell align="right">{t('buyerDeals.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiriesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  {t('buyerDeals.empty')}
                </TableCell>
              </TableRow>
            ) : (
              deals.map((d) => (
                <DealRow
                  key={d.id}
                  inquiry={d}
                  locale={i18n.language}
                  onConfirm={() => setConfirmTarget(d)}
                  onDispute={() => setDisputeTarget(d)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Confirm dialog */}
      <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('buyerDeals.confirmTitle')}</DialogTitle>
        <DialogContent>
          {confirmTarget && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                {t('buyerDeals.confirmBody', {
                  amount: confirmTarget.transactionValue
                    ? Number(confirmTarget.transactionValue).toLocaleString()
                    : '—',
                })}
              </Typography>
              {confirmMutation.isError && (
                <Alert severity="error">{extractErrorMessage(confirmMutation.error)}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="success"
            disabled={confirmMutation.isPending || !confirmTarget}
            onClick={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}
            sx={{ fontWeight: 700 }}
          >
            {confirmMutation.isPending ? t('common.loading') : t('buyerDeals.confirmCta')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute dialog */}
      {disputeTarget && (
        <DisputeDialog
          inquiry={disputeTarget}
          onClose={() => setDisputeTarget(null)}
          onSuccess={() => {
            setDisputeTarget(null);
            void qc.invalidateQueries({ queryKey: ['inquiries'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ------------------------------------------------------------------
// Row — also fetches the listing title lazily for nicer copy.
// ------------------------------------------------------------------

function DealRow({
  inquiry,
  locale,
  onConfirm,
  onDispute,
}: {
  inquiry: Inquiry;
  locale: string;
  onConfirm: () => void;
  onDispute: () => void;
}) {
  const { t } = useTranslation();
  const listingQuery = useQuery({
    queryKey: ['listings', inquiry.listingId],
    queryFn: () => listingsApi.getById(inquiry.listingId),
    staleTime: 60_000,
  });
  const palette = DEAL_STATUS_COLORS[inquiry.dealStatus] ?? DEAL_STATUS_COLORS.none;
  const canAct = inquiry.dealStatus === 'pending_confirmation';

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {listingQuery.data?.title ?? <Skeleton width={140} />}
        </Typography>
        {listingQuery.data?.referenceCode && (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {listingQuery.data.referenceCode}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {inquiry.transactionValue
            ? `${Number(inquiry.transactionValue).toLocaleString(locale)} ${t('listing.currency')}`
            : '—'}
        </Typography>
      </TableCell>
      <TableCell>
        {inquiry.closedAt ? new Date(inquiry.closedAt).toLocaleDateString(locale) : '—'}
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={t(palette.labelKey)}
          sx={{ bgcolor: palette.bg, color: palette.text, fontWeight: 700 }}
        />
        {inquiry.dealStatus === 'disputed' && inquiry.disputeReason && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {inquiry.disputeReason}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {canAct ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={onConfirm}
            >
              {t('buyerDeals.confirm')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<GavelIcon />}
              onClick={onDispute}
            >
              {t('buyerDeals.dispute')}
            </Button>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

// ------------------------------------------------------------------
// Dispute dialog
// ------------------------------------------------------------------

function DisputeDialog({
  inquiry,
  onClose,
  onSuccess,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [reasonChoice, setReasonChoice] = useState<typeof DISPUTE_REASONS[number]>(DISPUTE_REASONS[0]);
  const [detail, setDetail] = useState('');

  const reasonLabel = (r: typeof DISPUTE_REASONS[number]) => t(`buyerDeals.disputeReasons.${r}`);

  const mutation = useMutation({
    mutationFn: () => {
      const reasonText = reasonLabel(reasonChoice);
      const composed = reasonChoice === 'other'
        ? detail.trim()
        : detail.trim()
          ? `${reasonText}: ${detail.trim()}`
          : reasonText;
      return inquiriesApi.raiseDispute(inquiry.id, { reason: composed });
    },
    onSuccess: () => onSuccess(),
  });

  const submitDisabled =
    mutation.isPending ||
    (reasonChoice === 'other' && detail.trim().length < 4);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('buyerDeals.disputeTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('buyerDeals.disputePrompt')}
          </Typography>

          <FormControl>
            <RadioGroup
              value={reasonChoice}
              onChange={(_, v) => setReasonChoice(v as typeof DISPUTE_REASONS[number])}
            >
              {DISPUTE_REASONS.map((r) => (
                <FormControlLabel key={r} value={r} control={<Radio />} label={reasonLabel(r)} />
              ))}
            </RadioGroup>
          </FormControl>

          <TextField
            multiline
            minRows={3}
            label={reasonChoice === 'other'
              ? t('buyerDeals.disputeReasonRequired')
              : t('buyerDeals.disputeReasonOptional')}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            required={reasonChoice === 'other'}
          />

          {mutation.isError && (
            <Alert severity="error">{extractErrorMessage(mutation.error)}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          color="error"
          disabled={submitDisabled}
          onClick={() => mutation.mutate()}
          startIcon={<GavelIcon />}
          sx={{ fontWeight: 700 }}
        >
          {mutation.isPending ? t('common.loading') : t('buyerDeals.disputeSubmit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Re-export for clarity in router imports.
export default BuyerDealsPage;
