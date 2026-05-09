import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { bookingsApi, type BookingStatus } from '@/api/bookings.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const STATUS_COLOR: Record<BookingStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
};

export function BookingsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'guest' | 'host'>('guest');

  const guestQuery = useQuery({
    queryKey: ['bookings', 'guest'],
    queryFn: () => bookingsApi.my(),
    enabled: tab === 'guest',
  });
  const hostQuery = useQuery({
    queryKey: ['bookings', 'host'],
    queryFn: () => bookingsApi.host(),
    enabled: tab === 'host',
  });
  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const data = tab === 'guest' ? guestQuery.data ?? [] : hostQuery.data ?? [];
  const loading = tab === 'guest' ? guestQuery.isLoading : hostQuery.isLoading;

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('booking.myBookings')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('booking.myBookings')} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="guest" label={t('booking.tabGuest')} />
        <Tab value="host" label={t('booking.tabHost')} />
      </Tabs>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : data.length === 0 ? (
          <EmptyState title={t('booking.noBookings')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('booking.checkIn')}</TableCell>
                <TableCell>{t('booking.checkOut')}</TableCell>
                <TableCell align="right">{t('booking.nights')}</TableCell>
                <TableCell align="right">{t('booking.totalAmount')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('admin.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>{b.checkIn}</TableCell>
                  <TableCell>{b.checkOut}</TableCell>
                  <TableCell align="right">{b.nights}</TableCell>
                  <TableCell align="right">
                    {b.totalAmount.toLocaleString(i18n.language)} {t('listing.currency')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STATUS_COLOR[b.status]}
                      label={t(`booking.status.${b.status}`, { defaultValue: b.status })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {tab === 'host' && b.status === 'pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => confirmMutation.mutate(b.id)}
                        >
                          {t('booking.confirm')}
                        </Button>
                      )}
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => cancelMutation.mutate(b.id)}
                        >
                          {t('booking.cancel')}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {!loading && data.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('booking.helpTip')}
        </Typography>
      )}
    </DashboardLayout>
  );
}
