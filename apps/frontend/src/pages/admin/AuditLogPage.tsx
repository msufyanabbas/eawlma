import {
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { adminApi } from '@/api/admin.api';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';

interface AuditEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changedFields: Record<string, { before: unknown; after: unknown }>;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

interface AuditPage {
  data: AuditEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

const ENTITY_TYPES = ['', 'listing', 'user', 'inquiry', 'payment', 'subscription'];
const PAGE_SIZE = 25;

export function AuditLogPage() {
  const { t, i18n } = useTranslation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit', { page, search, entityType, action, actorId, from, to }],
    queryFn: () =>
      adminApi.audit({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        actorId: actorId || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      }),
  });

  // The /admin/audit endpoint is wrapped by the global response interceptor in
  // `{ data, timestamp }` form, so the inner pagination payload sits at
  // `auditQuery.data.data`. Some legacy callers (and error responses) may
  // surface the unwrapped shape directly — guard both, with a safe default
  // so the table never crashes on undefined `.meta.total`.
  const envelope = auditQuery.data as
    | { data?: AuditPage }
    | AuditPage
    | undefined;
  const safeMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  const inner = (envelope as { data?: AuditPage } | undefined)?.data ?? (envelope as AuditPage | undefined);
  const audit: AuditPage = {
    data: inner?.data ?? [],
    meta: {
      page: inner?.meta?.page ?? safeMeta.page,
      limit: inner?.meta?.limit ?? safeMeta.limit,
      total: inner?.meta?.total ?? safeMeta.total,
      totalPages: inner?.meta?.totalPages ?? safeMeta.totalPages,
      hasNext: inner?.meta?.hasNext ?? safeMeta.hasNext,
      hasPrev: inner?.meta?.hasPrev ?? safeMeta.hasPrev,
    },
  };

  const toggleRow = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const csvHref = buildCsvUrl({
    entityType: entityType || undefined,
    action: action || undefined,
    actorId: actorId || undefined,
    search: search || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  });

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.audit')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('admin.audit')}
        subtitle={`${(audit?.meta?.total ?? 0).toLocaleString(i18n.language)} entries`}
        action={
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            component="a"
            href={csvHref}
            download
          >
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ flex: 1, maxWidth: { md: 320 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField select size="small" label="Entity"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            sx={{ minWidth: 160 }}
          >
            {ENTITY_TYPES.map((e) => <MenuItem key={e} value={e}>{e || 'All'}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} sx={{ minWidth: 160 }} />
          <TextField size="small" label="Actor ID" value={actorId} onChange={(e) => { setActorId(e.target.value); setPage(1); }} sx={{ minWidth: 240 }} />
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </Stack>
      </Paper>

      {/* Table */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36 }} />
              <TableCell>Timestamp</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditQuery.isLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton /></TableCell></TableRow>
              ))
            ) : (audit?.data?.length ?? 0) === 0 ? (
              <TableRow><TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>No matching audit entries</TableCell></TableRow>
            ) : (
              (audit?.data ?? []).map((row) => {
                const isOpen = expanded.has(row.id);
                const summary = Object.keys(row.changedFields ?? {});
                return (
                  <RowGroup
                    key={row.id}
                    row={row}
                    isOpen={isOpen}
                    summary={summary}
                    onToggle={() => toggleRow(row.id)}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {(audit?.meta?.totalPages ?? 0) > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination page={page} count={audit.meta.totalPages} onChange={(_, p) => setPage(p)} color="primary" />
        </Stack>
      )}
    </AdminLayout>
  );
}

function RowGroup({
  row,
  isOpen,
  summary,
  onToggle,
}: {
  row: AuditEntry;
  isOpen: boolean;
  summary: string[];
  onToggle: () => void;
}) {
  const { i18n } = useTranslation();
  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={onToggle}>
        <TableCell>
          <IconButton size="small">{isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}</IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{new Date(row.createdAt).toLocaleString(i18n.language)}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {row.actorId ? row.actorId.slice(0, 8) : 'system'}
          </Typography>
        </TableCell>
        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.action}</Typography></TableCell>
        <TableCell>
          <Typography variant="body2">{row.entityType}</Typography>
          {row.entityId && (
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {row.entityId.slice(0, 8)}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {summary.length === 0 ? '—' : summary.slice(0, 3).join(', ') + (summary.length > 3 ? `, +${summary.length - 3}` : '')}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, borderBottom: isOpen ? 1 : 0, borderColor: 'divider' }}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03) }}>
              {summary.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No field-level changes captured.</Typography>
              ) : (
                <Stack spacing={1}>
                  {summary.map((field) => {
                    const diff = row.changedFields[field];
                    return (
                      <Stack key={field} direction="row" spacing={2} alignItems="flex-start">
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 140, fontWeight: 600 }}>
                          {field}
                        </Typography>
                        <Box sx={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}>
                          <DiffLine label="-" value={diff?.before} color="error" />
                          <DiffLine label="+" value={diff?.after} color="success" />
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
              <Stack direction="row" spacing={3} sx={{ mt: 2, color: 'text.secondary' }}>
                <Typography variant="caption">IP: {row.ipAddress ?? '—'}</Typography>
                <Typography variant="caption">UA: {row.userAgent ?? '—'}</Typography>
                <Typography variant="caption">req: {row.requestId ?? '—'}</Typography>
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function DiffLine({ label, value, color }: { label: string; value: unknown; color: 'success' | 'error' }) {
  const text = value === undefined || value === null ? 'null' : typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
  return (
    <Box
      sx={{
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.08),
        color: `${color}.dark`,
        borderRadius: 1,
        px: 1,
        py: 0.25,
        my: 0.25,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <Box component="span" sx={{ opacity: 0.6, mr: 1, fontWeight: 700 }}>{label}</Box>
      {text}
    </Box>
  );
}

/**
 * Builds a fully-qualified CSV download URL with the access token in the
 * `Authorization` query (the export route is auth-gated; browsers don't send
 * Bearer headers via plain `<a download>` links so we mint a one-shot URL).
 *
 * NOTE: real production would use a short-lived signed download token instead
 * of leaking the access token in the URL. This is a dev-mode convenience.
 */
function buildCsvUrl(params: Record<string, string | undefined>): string {
  const base = apiClient.defaults.baseURL ?? '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const token = useAuthStore.getState().getAccessToken();
  if (token) search.set('access_token', token); // ← pseudo; backend should accept query token, otherwise the user can use Swagger
  const qs = search.toString();
  return `${base}/admin/audit/export.csv${qs ? `?${qs}` : ''}`;
}
