import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { DisputeFavor, Inquiry } from '@eawlma/shared-types';

import { inquiriesApi } from '@/api/inquiries.api';
import { listingsApi } from '@/api/listings.api';
import { agentsApi } from '@/api/agents.api';
import { extractErrorMessage } from '@/api/client';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';

export function AdminDisputesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const disputesQuery = useQuery({
    queryKey: ['inquiries', 'admin-disputes'],
    queryFn: () => inquiriesApi.adminListDisputes(),
  });

  const disputes = disputesQuery.data ?? [];
  const active = disputes.find((d) => d.id === activeId) ?? null;

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('adminDisputes.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('adminDisputes.title')}
        subtitle={t('adminDisputes.subtitle')}
      />

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('adminDisputes.listing')}</TableCell>
              <TableCell>{t('adminDisputes.agent')}</TableCell>
              <TableCell>{t('adminDisputes.buyer')}</TableCell>
              <TableCell>{t('adminDisputes.amount')}</TableCell>
              <TableCell>{t('adminDisputes.reason')}</TableCell>
              <TableCell>{t('adminDisputes.raisedBy')}</TableCell>
              <TableCell>{t('adminDisputes.date')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {disputesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton /></TableCell></TableRow>
              ))
            ) : disputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  {t('adminDisputes.empty')}
                </TableCell>
              </TableRow>
            ) : (
              disputes.map((d) => (
                <DisputeRow
                  key={d.id}
                  inquiry={d}
                  locale={i18n.language}
                  onClick={() => setActiveId(d.id)}
                  selected={activeId === d.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <DisputeDrawer
        inquiry={active}
        onClose={() => setActiveId(null)}
        onResolved={() => {
          setActiveId(null);
          void qc.invalidateQueries({ queryKey: ['inquiries', 'admin-disputes'] });
          void qc.invalidateQueries({ queryKey: ['inquiries', 'admin-disputes-count'] });
        }}
      />
    </AdminLayout>
  );
}

function DisputeRow({
  inquiry,
  locale,
  onClick,
  selected,
}: {
  inquiry: Inquiry;
  locale: string;
  onClick: () => void;
  selected: boolean;
}) {
  const listingQuery = useQuery({
    queryKey: ['listings', inquiry.listingId],
    queryFn: () => listingsApi.getById(inquiry.listingId),
    staleTime: 60_000,
  });
  return (
    <TableRow hover selected={selected} sx={{ cursor: 'pointer' }} onClick={onClick}>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {listingQuery.data?.title ?? <Skeleton width={120} />}
        </Typography>
        {listingQuery.data?.referenceCode && (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {listingQuery.data.referenceCode}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {(inquiry.agentId ?? '').slice(0, 8)}…
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {inquiry.userId ? `${inquiry.userId.slice(0, 8)}…` : inquiry.guestName ?? '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {inquiry.transactionValue
            ? `${Number(inquiry.transactionValue).toLocaleString(locale)} SAR`
            : '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            maxWidth: 240,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={inquiry.disputeReason ?? ''}
        >
          {inquiry.disputeReason ?? '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={
            inquiry.disputeRaisedBy === inquiry.userId
              ? 'Buyer'
              : inquiry.disputeRaisedBy === inquiry.agentId
                ? 'Agent'
                : 'Other'
          }
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        {inquiry.disputeRaisedAt
          ? new Date(inquiry.disputeRaisedAt).toLocaleDateString(locale)
          : '—'}
      </TableCell>
    </TableRow>
  );
}

// ------------------------------------------------------------------
// Drawer with full detail and admin resolution form
// ------------------------------------------------------------------

function DisputeDrawer({
  inquiry,
  onClose,
  onResolved,
}: {
  inquiry: Inquiry | null;
  onClose: () => void;
  onResolved: () => void;
}) {
  const { t } = useTranslation();
  const [resolution, setResolution] = useState('');

  const listingQuery = useQuery({
    queryKey: ['listings', inquiry?.listingId],
    queryFn: () => listingsApi.getById(inquiry!.listingId),
    enabled: Boolean(inquiry),
  });
  const agentQuery = useQuery({
    queryKey: ['agents', inquiry?.agentId],
    queryFn: () => agentsApi.getById(inquiry!.agentId!),
    enabled: Boolean(inquiry?.agentId),
    retry: false,
  });

  const resolveMutation = useMutation({
    mutationFn: (favor: DisputeFavor) =>
      inquiriesApi.adminResolveDispute(inquiry!.id, { resolution: resolution.trim(), favor }),
    onSuccess: () => {
      setResolution('');
      onResolved();
    },
  });

  const submitDisabled = resolution.trim().length < 4 || resolveMutation.isPending;

  return (
    <Drawer
      anchor="right"
      open={!!inquiry}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      {!inquiry ? null : (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t('adminDisputes.drawerTitle')}
            </Typography>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Stack>

          {/* Listing block */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {t('adminDisputes.listing')}
            </Typography>
            {listingQuery.isLoading || !listingQuery.data ? (
              <Skeleton width="80%" />
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {listingQuery.data.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {listingQuery.data.referenceCode} · {listingQuery.data.city}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    component={Link}
                    to={'/listings/$id' as never}
                    params={{ id: listingQuery.data.id } as never}
                    size="small"
                    startIcon={<OpenInNewIcon />}
                  >
                    {t('adminDisputes.openListing')}
                  </Button>
                </Box>
              </>
            )}
          </Paper>

          {/* Agent's side */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {t('adminDisputes.agentSide')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
              {agentQuery.data
                ? `${agentQuery.data.firstName} ${agentQuery.data.lastName}`.trim()
                : (inquiry.agentId ?? '').slice(0, 8) + '…'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {t('adminDisputes.closedAmount')}:{' '}
              <strong>
                {inquiry.transactionValue
                  ? `${Number(inquiry.transactionValue).toLocaleString()} SAR`
                  : '—'}
              </strong>
            </Typography>
            {inquiry.agentNotes && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminDisputes.agentNotes')}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {inquiry.agentNotes}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Buyer's side */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {t('adminDisputes.buyerSide')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
              {inquiry.guestName ?? (inquiry.userId ? inquiry.userId.slice(0, 8) + '…' : 'Anonymous')}
            </Typography>
            {inquiry.disputeReason && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminDisputes.disputeReason')}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {inquiry.disputeReason}
                </Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('adminDisputes.raisedOn')}{' '}
              {inquiry.disputeRaisedAt
                ? new Date(inquiry.disputeRaisedAt).toLocaleString()
                : '—'}{' '}
              {t('adminDisputes.by')}{' '}
              {inquiry.disputeRaisedBy === inquiry.userId
                ? 'buyer'
                : inquiry.disputeRaisedBy === inquiry.agentId
                  ? 'agent'
                  : 'other'}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {t('adminDisputes.chatHistory')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
              {t('adminDisputes.chatHistoryHint')}
            </Typography>
            <Button
              component={Link}
              to={'/dashboard/messages' as never}
              search={inquiry.userId ? ({ agentId: inquiry.userId } as never) : ({} as never)}
              size="small"
              startIcon={<OpenInNewIcon />}
              sx={{ mt: 1 }}
              disabled={!inquiry.userId}
            >
              {t('adminDisputes.openChat')}
            </Button>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Resolution form */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t('adminDisputes.resolutionTitle')}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={t('adminDisputes.resolutionNotes')}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            sx={{ mb: 2 }}
          />

          {resolveMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage(resolveMutation.error)}
            </Alert>
          )}

          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              disabled={submitDisabled}
              onClick={() => resolveMutation.mutate('agent')}
              sx={{ fontWeight: 700 }}
            >
              {t('adminDisputes.favorAgent')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<CancelIcon />}
              disabled={submitDisabled}
              onClick={() => resolveMutation.mutate('buyer')}
              sx={{ fontWeight: 700, bgcolor: 'info.main', '&:hover': { bgcolor: 'info.dark' } }}
            >
              {t('adminDisputes.favorBuyer')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="inherit"
              startIcon={<BlockIcon />}
              disabled={submitDisabled}
              onClick={() => resolveMutation.mutate('cancelled')}
              sx={{ fontWeight: 700, bgcolor: 'grey.300', color: 'grey.900', '&:hover': { bgcolor: 'grey.400' } }}
            >
              {t('adminDisputes.cancelDeal')}
            </Button>
          </Stack>

          <Box sx={{ mt: 2, color: 'text.secondary' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GavelIcon fontSize="small" />
              <Typography variant="caption">{t('adminDisputes.resolutionHint')}</Typography>
            </Stack>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

export default AdminDisputesPage;
