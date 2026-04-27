import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import EmailIcon from '@mui/icons-material/MailOutline';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { InquiryStatus, type Inquiry } from '@aqarat/shared-types';

import { inquiriesApi } from '@/api/inquiries.api';
import { listingsApi } from '@/api/listings.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { InquiryStatusChip } from './components/StatusChip';

const STATUS_FILTERS: Array<'all' | InquiryStatus> = [
  'all',
  InquiryStatus.NEW,
  InquiryStatus.CONTACTED,
  InquiryStatus.QUALIFIED,
  InquiryStatus.UNQUALIFIED,
  InquiryStatus.CLOSED,
];

export function InquiriesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const inquiriesQuery = useQuery({
    queryKey: ['inquiries', 'mine-agent', { status: filter, limit: 100 }],
    queryFn: () =>
      inquiriesApi.mineAsAgent({
        page: 1,
        limit: 100,
        ...(filter === 'all' ? {} : { sortBy: 'createdAt' }),
      }),
  });

  const inquiries = (inquiriesQuery.data?.data ?? []).filter((i) => filter === 'all' || i.status === filter);
  const active = inquiries.find((i) => i.id === activeId) ?? null;

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.inquiries')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('dashboard.inquiries')} />

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s}
              label={s === 'all' ? 'All' : s}
              onClick={() => setFilter(s)}
              color={filter === s ? 'primary' : 'default'}
              variant={filter === s ? 'filled' : 'outlined'}
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            />
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lead</TableCell>
              <TableCell>Listing</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiriesQuery.isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton /></TableCell>
                  </TableRow>
                ))
              : inquiries.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                        No inquiries match this filter
                      </TableCell>
                    </TableRow>
                  )
                : inquiries.map((inq) => (
                    <TableRow
                      key={inq.id}
                      hover
                      onClick={() => setActiveId(inq.id)}
                      sx={{ cursor: 'pointer' }}
                      selected={activeId === inq.id}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32 }}>{(inq.guestName ?? 'L').charAt(0).toUpperCase()}</Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{inq.guestName ?? '—'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {inq.listingId.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          {inq.guestPhone && <Typography variant="caption">{inq.guestPhone}</Typography>}
                          {inq.guestEmail && <Typography variant="caption" color="text.secondary">{inq.guestEmail}</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell>{new Date(inq.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                      <TableCell><InquiryStatusChip status={inq.status} /></TableCell>
                      <TableCell align="right">
                        <Button size="small" component={Link} to="/messages" startIcon={<ChatIcon />}>
                          Reply
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </Paper>

      <InquiryDrawer
        inquiry={active}
        onClose={() => setActiveId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ['inquiries', 'mine-agent'] })}
      />
    </DashboardLayout>
  );
}

// ------------------------------------------------------------------
// Inquiry detail drawer
// ------------------------------------------------------------------

interface InquiryDrawerProps {
  inquiry: Inquiry | null;
  onClose: () => void;
  onUpdated: () => void;
}

function InquiryDrawer({ inquiry, onClose, onUpdated }: InquiryDrawerProps) {
  const { t } = useTranslation();
  const [agentNotes, setAgentNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [status, setStatus] = useState<InquiryStatus>(InquiryStatus.NEW);

  useEffect(() => {
    if (!inquiry) return;
    setAgentNotes(inquiry.agentNotes ?? '');
    setNextAction(inquiry.nextAction ?? '');
    setNextActionAt(inquiry.nextActionAt ? inquiry.nextActionAt.slice(0, 16) : '');
    setStatus(inquiry.status);
  }, [inquiry]);

  const listingQuery = useQuery({
    queryKey: ['listings', inquiry?.listingId],
    queryFn: () => listingsApi.getById(inquiry!.listingId),
    enabled: Boolean(inquiry),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<{ status: InquiryStatus; agentNotes: string; nextAction: string; nextActionAt: string | null }>) =>
      inquiriesApi.update(inquiry!.id, patch),
    onSuccess: () => onUpdated(),
  });

  const saveNotes = () => {
    if (!inquiry) return;
    if ((inquiry.agentNotes ?? '') === agentNotes && (inquiry.nextAction ?? '') === nextAction) return;
    updateMutation.mutate({
      agentNotes,
      nextAction,
      nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
    });
  };

  const changeStatus = (next: InquiryStatus) => {
    setStatus(next);
    updateMutation.mutate({ status: next });
  };

  const whatsapp = useMemo(() => {
    if (!inquiry?.guestPhone) return '#';
    return `https://wa.me/${inquiry.guestPhone.replace(/\D/g, '')}`;
  }, [inquiry?.guestPhone]);

  return (
    <Drawer anchor="right" open={!!inquiry} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      {!inquiry ? null : (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Inquiry detail</Typography>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Stack>

          {/* Buyer block */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Avatar sx={{ width: 40, height: 40 }}>{(inquiry.guestName ?? 'L').charAt(0).toUpperCase()}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{inquiry.guestName ?? 'Anonymous'}</Typography>
                <InquiryStatusChip status={inquiry.status} />
              </Box>
            </Stack>
            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              {inquiry.guestEmail && (
                <Stack direction="row" spacing={1} alignItems="center"><EmailIcon fontSize="small" color="action" /><Typography variant="body2">{inquiry.guestEmail}</Typography></Stack>
              )}
              {inquiry.guestPhone && (
                <Stack direction="row" spacing={1} alignItems="center"><PhoneIcon fontSize="small" color="action" /><Typography variant="body2">{inquiry.guestPhone}</Typography></Stack>
              )}
            </Stack>
          </Paper>

          {/* Listing snapshot */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.secondary">Listing</Typography>
            {listingQuery.isLoading || !listingQuery.data ? (
              <Skeleton width="80%" />
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{listingQuery.data.title}</Typography>
                <Typography variant="caption" color="text.secondary">{listingQuery.data.referenceCode} · {listingQuery.data.city}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {Number(listingQuery.data.price).toLocaleString()} SAR
                </Typography>
                <Button
                  component={Link}
                  to={`/listings/${listingQuery.data.id}` as never}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  View public page
                </Button>
              </>
            )}
          </Paper>

          {/* Original message */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.secondary">Message</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
              {inquiry.message}
            </Typography>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Status update */}
          <TextField
            select
            fullWidth
            size="small"
            label="Status"
            value={status}
            onChange={(e) => changeStatus(e.target.value as InquiryStatus)}
            sx={{ mb: 2 }}
          >
            {Object.values(InquiryStatus).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>

          {/* Agent notes — auto-save on blur */}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Agent notes (saved on blur)"
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
            onBlur={saveNotes}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Next action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              onBlur={saveNotes}
            />
            <TextField
              size="small"
              type="datetime-local"
              label="When"
              InputLabelProps={{ shrink: true }}
              value={nextActionAt}
              onChange={(e) => setNextActionAt(e.target.value)}
              onBlur={saveNotes}
              sx={{ width: 220 }}
            />
          </Stack>

          {updateMutation.isError && (
            <Typography variant="caption" color="error">Could not save changes — try again.</Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ChatIcon />}
              component={Link}
              to="/messages"
            >
              Reply via Message
            </Button>
            {inquiry.guestPhone && (
              <Button
                fullWidth
                variant="outlined"
                color="success"
                startIcon={<WhatsAppIcon />}
                href={whatsapp}
                target="_blank"
                rel="noopener"
              >
                {t('listing.whatsapp')}
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
