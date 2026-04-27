import {
  Box,
  Button,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AnalyticsIcon from '@mui/icons-material/InsertChartOutlined';
import RocketIcon from '@mui/icons-material/RocketLaunch';
import CopyIcon from '@mui/icons-material/ContentCopy';
import MoreIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type MouseEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ListingStatus, type Listing } from '@aqarat/shared-types';

import { listingsApi } from '@/api/listings.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { ListingCard } from '@/components/global/ListingCard';
import { ConfirmDialog } from '@/components/global/ConfirmDialog';
import { EmptyState } from '@/components/global/EmptyState';
import { ListingStatusChip } from './components/StatusChip';

const PAGE_SIZE = 12;

type StatusFilter = 'all' | ListingStatus;

export function MyListingsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const [view, setView] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; listing: Listing } | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; ids: string[] } | null>(null);

  const listingsQuery = useQuery({
    queryKey: ['listings', 'mine', { page, limit: PAGE_SIZE }],
    queryFn: () => listingsApi.mine({ page, limit: PAGE_SIZE }),
  });

  const filtered = (listingsQuery.data?.data ?? []).filter(
    (l) => statusFilter === 'all' || l.status === statusFilter,
  );
  const total = listingsQuery.data?.meta.total ?? 0;
  const totalPages = listingsQuery.data?.meta.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await listingsApi.remove(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listings', 'mine'] });
      setSelected(new Set());
      setConfirm(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await listingsApi.submit(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listings', 'mine'] });
      setSelected(new Set());
    },
  });

  // ----- Selection helpers ------------------------------------------
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.listings')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('dashboard.listings')}
        subtitle={`${total.toLocaleString(i18n.language)} ${t('search.results')}`}
        action={
          <Button
            component={Link}
            to="/dashboard/listings/new"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            {t('dashboard.newListing')}
          </Button>
        }
      />

      {/* Filter chips + view toggle + bulk actions */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
          {(['all', ListingStatus.ACTIVE, ListingStatus.PENDING_REVIEW, ListingStatus.REJECTED, ListingStatus.EXPIRED, ListingStatus.DRAFT] as StatusFilter[]).map((s) => (
            <Chip
              key={s}
              label={s === 'all' ? 'All' : s.replace('_', ' ')}
              onClick={() => setStatusFilter(s)}
              color={statusFilter === s ? 'primary' : 'default'}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            />
          ))}
          <Box sx={{ flex: 1 }} />
          {selected.size > 0 && (
            <>
              <Typography variant="body2" color="text.secondary">
                {selected.size} selected
              </Typography>
              <Button
                size="small"
                onClick={() => submitMutation.mutate(Array.from(selected))}
                disabled={submitMutation.isPending}
              >
                Submit for review
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => setConfirm({ open: true, ids: Array.from(selected) })}
              >
                Delete
              </Button>
            </>
          )}
          <ToggleButtonGroup
            value={view}
            exclusive
            size="small"
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="table"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* Body */}
      {filtered.length === 0 ? (
        <Paper sx={{ p: 0 }}>
          <EmptyState
            title={t('empty.noListings')}
            description={t('app.tagline')}
            ctaLabel={t('empty.noListingsCta')}
            onCta={() => undefined}
          />
        </Paper>
      ) : view === 'table' ? (
        <Paper sx={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Views</TableCell>
                <TableCell align="right">Inquiries</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} hover selected={selected.has(l.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(l.id)} onChange={() => toggleSelected(l.id)} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {l.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.city}{l.district ? `, ${l.district}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {l.referenceCode}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{l.type}</TableCell>
                  <TableCell><ListingStatusChip status={l.status} /></TableCell>
                  <TableCell align="right">
                    {Number(l.price).toLocaleString(i18n.language)} {t('listing.currency')}
                  </TableCell>
                  <TableCell align="right">{l.viewCount ?? 0}</TableCell>
                  <TableCell align="right">{l.inquiryCount ?? 0}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e: MouseEvent<HTMLElement>) => setRowMenu({ anchor: e.currentTarget, listing: l })}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((l) => (
            <Grid key={l.id} item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <ListingCard listing={l} />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    component={Link}
                    to={`/dashboard/listings/${l.id}/edit` as never}
                    startIcon={<EditIcon />}
                    fullWidth
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    component={Link}
                    to={`/dashboard/listings/${l.id}/analytics` as never}
                    startIcon={<AnalyticsIcon />}
                    fullWidth
                  >
                    Analytics
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            page={page}
            count={totalPages}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Stack>
      )}

      {/* Row action menu */}
      <Menu
        open={!!rowMenu}
        anchorEl={rowMenu?.anchor}
        onClose={() => setRowMenu(null)}
      >
        <MenuItem
          component={Link}
          to={`/dashboard/listings/${rowMenu?.listing.id ?? ''}/edit` as never}
          onClick={() => setRowMenu(null)}
        >
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit
        </MenuItem>
        <MenuItem
          component={Link}
          to={`/dashboard/listings/${rowMenu?.listing.id ?? ''}/analytics` as never}
          onClick={() => setRowMenu(null)}
        >
          <AnalyticsIcon fontSize="small" sx={{ mr: 1.5 }} /> Analytics
        </MenuItem>
        <MenuItem
          component={Link}
          to="/dashboard/subscription"
          onClick={() => setRowMenu(null)}
        >
          <RocketIcon fontSize="small" sx={{ mr: 1.5 }} /> Boost (feature)
        </MenuItem>
        <MenuItem onClick={() => setRowMenu(null)} disabled>
          <CopyIcon fontSize="small" sx={{ mr: 1.5 }} /> Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            const id = rowMenu?.listing.id;
            setRowMenu(null);
            if (id) setConfirm({ open: true, ids: [id] });
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!confirm?.open}
        title={`Delete ${confirm?.ids.length ?? 0} listing(s)?`}
        description="This action soft-deletes the listing — it will no longer appear publicly."
        destructive
        loading={deleteMutation.isPending}
        confirmLabel="Delete"
        onConfirm={() => confirm && deleteMutation.mutate(confirm.ids)}
        onCancel={() => setConfirm(null)}
      />
    </DashboardLayout>
  );
}
