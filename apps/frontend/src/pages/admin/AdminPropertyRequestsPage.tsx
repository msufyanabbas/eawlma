import {
  Box,
  Chip,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import {
  propertyRequestsApi,
  type PropertyRequestStatus,
} from '@/api/propertyRequests.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_OPTIONS: PropertyRequestStatus[] = ['open', 'matched', 'closed'];

const STATUS_COLOR: Record<PropertyRequestStatus, 'default' | 'success' | 'info'> = {
  open: 'info',
  matched: 'success',
  closed: 'default',
};

export function AdminPropertyRequestsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PropertyRequestStatus | 'all'>('all');

  const query = useQuery({
    queryKey: ['property-requests', 'admin', statusFilter],
    queryFn: () =>
      propertyRequestsApi.adminAll(statusFilter === 'all' ? undefined : statusFilter),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PropertyRequestStatus }) =>
      propertyRequestsApi.adminUpdateStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['property-requests'] });
    },
  });

  const rows = query.data ?? [];
  const fmtBudget = (min: number | null, max: number | null) => {
    if (min == null && max == null) return '—';
    if (min != null && max != null) {
      return `${min.toLocaleString(i18n.language)} – ${max.toLocaleString(i18n.language)}`;
    }
    return min != null ? `≥ ${min.toLocaleString(i18n.language)}` : `≤ ${max?.toLocaleString(i18n.language)}`;
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.propertyRequests')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('admin.propertyRequests')}
        subtitle={t('admin.propertyRequestsSubtitle')}
      />

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography sx={{ fontWeight: 800 }}>
            {t('admin.allPropertyRequests')}
          </Typography>
          <TextField
            select
            size="small"
            label={t('common.status')}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as PropertyRequestStatus | 'all')
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">{t('common.viewAll')}</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {t(`admin.propertyRequestStatus.${s}`, { defaultValue: s })}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {query.isLoading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : rows.length === 0 ? (
          <EmptyState title={t('admin.noPropertyRequests')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('search.city')}</TableCell>
                <TableCell>{t('propertyRequest.propertyType')}</TableCell>
                <TableCell>{t('propertyRequest.bedrooms')}</TableCell>
                <TableCell>{t('listing.price')}</TableCell>
                <TableCell>{t('propertyRequest.contactPhone')}</TableCell>
                <TableCell>{t('common.date')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.city}</TableCell>
                  <TableCell>
                    {t(`propertyTypes.${r.propertyType.toLowerCase()}`, {
                      defaultValue: r.propertyType,
                    })}
                  </TableCell>
                  <TableCell>{r.bedrooms ?? '—'}</TableCell>
                  <TableCell>{fmtBudget(r.minBudget, r.maxBudget)}</TableCell>
                  <TableCell>{r.contactPhone}</TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleDateString(i18n.language)}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={r.status}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: r.id,
                          status: e.target.value as PropertyRequestStatus,
                        })
                      }
                      SelectProps={{
                        renderValue: (val) => (
                          <Chip
                            size="small"
                            color={STATUS_COLOR[val as PropertyRequestStatus]}
                            label={t(`admin.propertyRequestStatus.${val}`, {
                              defaultValue: String(val),
                            })}
                          />
                        ),
                      }}
                      sx={{ minWidth: 140 }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s}>
                          {t(`admin.propertyRequestStatus.${s}`, { defaultValue: s })}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}
