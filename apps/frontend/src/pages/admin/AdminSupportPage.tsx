import {
  Alert,
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
import SendIcon from '@mui/icons-material/Send';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import {
  supportApi,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from '@/api/support.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const CATEGORIES: SupportTicketCategory[] = [
  'general',
  'technical',
  'billing',
  'listing',
  'account',
  'other',
];

const STATUS_COLOR: Record<
  SupportTicketStatus,
  'default' | 'success' | 'warning' | 'info'
> = {
  open: 'success',
  in_progress: 'warning',
  resolved: 'info',
  closed: 'default',
};

export function AdminSupportPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | 'all'>('all');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');

  const listQuery = useQuery({
    queryKey: ['support', 'admin', statusFilter, categoryFilter],
    queryFn: () =>
      supportApi.adminList({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      }),
  });

  // Re-query the selected row periodically so an admin sees the user's
  // reply land without manually closing/re-opening the drawer.
  const messagesQuery = useQuery({
    queryKey: ['support', 'messages', selected?.id],
    queryFn: () => supportApi.listMessages(selected!.id),
    enabled: !!selected,
    refetchInterval: selected ? 10_000 : false,
  });
  const messages = messagesQuery.data ?? [];

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      supportApi.reply(id, message),
    onSuccess: () => {
      setReply('');
      void messagesQuery.refetch();
      void qc.invalidateQueries({ queryKey: ['support', 'admin'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: SupportTicketStatus;
    }) => supportApi.adminUpdateStatus(id, status),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['support', 'admin'] });
      if (selected?.id === updated.id) setSelected(updated);
    },
  });

  // Reset reply box when switching tickets.
  useEffect(() => {
    setReply('');
  }, [selected?.id]);

  const rows = listQuery.data ?? [];

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('support.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('support.title')}
        subtitle={t('support.adminSubtitle')}
      />

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'center' }}
          spacing={2}
          sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <TextField
            select
            size="small"
            label={t('support.status')}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SupportTicketStatus | 'all')
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">{t('common.all', 'All')}</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {t(`support.statuses.${s}`)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={t('support.category')}
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as SupportTicketCategory | 'all')
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">{t('common.all', 'All')}</MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {t(`support.categories.${c}`)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {listQuery.isLoading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Box>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('support.noTickets')}
            description={t('support.adminEmptyHint')}
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>{t('support.subject')}</TableCell>
                <TableCell>{t('admin.users')}</TableCell>
                <TableCell>{t('support.category')}</TableCell>
                <TableCell>{t('support.status')}</TableCell>
                <TableCell>{t('common.date', 'Date')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelected(row)}
                >
                  <TableCell>{row.ticketNumber ?? row.id.slice(0, 8)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.subject}</TableCell>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2">
                        {row.userName ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.userEmail}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={t(`support.categories.${row.category}`)} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STATUS_COLOR[row.status]}
                      label={t(`support.statuses.${row.status}`)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(row.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Ticket drawer */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
      >
        {selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    {selected.ticketNumber ?? '—'}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selected.subject}
                  </Typography>
                </Box>
                <IconButton onClick={() => setSelected(null)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={t(`support.categories.${selected.category}`)}
                />
                <TextField
                  select
                  size="small"
                  value={selected.status}
                  onChange={(e) =>
                    statusMutation.mutate({
                      id: selected.id,
                      status: e.target.value as SupportTicketStatus,
                    })
                  }
                  sx={{ minWidth: 160 }}
                  disabled={statusMutation.isPending}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {t(`support.statuses.${s}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                {selected.userName ?? '—'} · {selected.userEmail ?? ''}
              </Typography>
            </Box>

            {/* Original description + thread */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('support.originalDesc')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {selected.description}
                </Typography>
              </Paper>

              {messagesQuery.isLoading ? (
                <Skeleton height={48} />
              ) : (
                messages.map((m) => (
                  <Stack
                    key={m.id}
                    direction="row"
                    justifyContent={m.isStaff ? 'flex-start' : 'flex-end'}
                    sx={{ mb: 1.5 }}
                  >
                    <Box
                      sx={{
                        maxWidth: '80%',
                        bgcolor: m.isStaff ? 'background.paper' : 'primary.main',
                        color: m.isStaff ? 'text.primary' : 'common.white',
                        border: m.isStaff ? 1 : 0,
                        borderColor: 'divider',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      {m.isStaff && (
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}
                        >
                          {t('support.supportTeam')}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {m.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          color: m.isStaff ? 'text.secondary' : 'rgba(255,255,255,0.7)',
                          display: 'block',
                          mt: 0.25,
                        }}
                      >
                        {new Date(m.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Box>

            {/* Reply box */}
            <Divider />
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={1}
                maxRows={5}
                placeholder={t('support.writeReply')}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={selected.status === 'closed'}
              />
              <Button
                variant="contained"
                onClick={() =>
                  replyMutation.mutate({ id: selected.id, message: reply.trim() })
                }
                disabled={
                  !reply.trim() ||
                  replyMutation.isPending ||
                  selected.status === 'closed'
                }
                startIcon={<SendIcon />}
              >
                {t('support.reply')}
              </Button>
            </Box>
            {selected.status === 'closed' && (
              <Alert severity="info" sx={{ m: 2, mt: 0 }}>
                {t('support.closedHint')}
              </Alert>
            )}
          </Box>
        )}
      </Drawer>
    </AdminLayout>
  );
}
