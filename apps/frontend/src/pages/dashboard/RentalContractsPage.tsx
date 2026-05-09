import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { ejarApi, type RentalContractStatus } from '@/api/ejar.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_COLOR: Record<RentalContractStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending_signatures: 'warning',
  active: 'success',
  expired: 'default',
  cancelled: 'error',
};

export function RentalContractsPage() {
  const { t, i18n } = useTranslation();
  const query = useQuery({
    queryKey: ['rental-contracts', 'my'],
    queryFn: () => ejarApi.my(),
  });

  const rows = query.data ?? [];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('ejar.myContracts')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('ejar.myContracts')} subtitle={t('ejar.subtitle')} />

      <Paper sx={{ overflow: 'hidden' }}>
        {query.isLoading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : rows.length === 0 ? (
          <EmptyState title={t('ejar.noContracts')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('ejar.contractNumber')}</TableCell>
                <TableCell>{t('ejar.startDate')}</TableCell>
                <TableCell>{t('ejar.endDate')}</TableCell>
                <TableCell align="right">{t('ejar.monthlyRent')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('common.more')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {c.ejarContractNumber ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{c.startDate}</TableCell>
                  <TableCell>{c.endDate}</TableCell>
                  <TableCell align="right">
                    {Number(c.monthlyRent).toLocaleString(i18n.language)}{' '}
                    {t('listing.currency')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STATUS_COLOR[c.status]}
                      label={t(`ejar.status.${c.status}`, { defaultValue: c.status })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {c.ejarUrl && (
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon />}
                        href={c.ejarUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('ejar.viewContract')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </DashboardLayout>
  );
}
