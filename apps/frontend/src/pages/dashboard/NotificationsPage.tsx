import {
  Box,
  Button,
  Container,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import MailIcon from '@mui/icons-material/MailOutline';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import PaymentIcon from '@mui/icons-material/PaymentOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import HourglassIcon from '@mui/icons-material/HourglassBottom';
import StarIcon from '@mui/icons-material/StarOutline';
import VerifiedIcon from '@mui/icons-material/VerifiedUser';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { NotificationType, type Notification } from '@eawlma/shared-types';

import { notificationsApi } from '@/api/notifications.api';
import { useUiStore } from '@/store/ui.store';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

const PAGE_SIZE = 20;

const TYPE_META: Record<NotificationType, { icon: ReactNode; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' }> = {
  [NotificationType.INQUIRY_RECEIVED]:    { icon: <MailIcon />,     color: 'primary' },
  [NotificationType.MESSAGE_RECEIVED]:    { icon: <ChatIcon />,     color: 'info' },
  [NotificationType.LISTING_APPROVED]:    { icon: <CheckIcon />,    color: 'success' },
  [NotificationType.LISTING_REJECTED]:    { icon: <ErrorIcon />,    color: 'error' },
  [NotificationType.LISTING_EXPIRING]:    { icon: <HourglassIcon />,color: 'warning' },
  [NotificationType.LISTING_EXPIRED]:     { icon: <HourglassIcon />,color: 'error' },
  [NotificationType.PAYMENT_SUCCEEDED]:   { icon: <PaymentIcon />,  color: 'success' },
  [NotificationType.PAYMENT_FAILED]:      { icon: <PaymentIcon />,  color: 'error' },
  [NotificationType.ACCOUNT_VERIFIED]:    { icon: <VerifiedIcon />, color: 'success' },
  [NotificationType.PRICE_DROP]:          { icon: <HomeIcon />,     color: 'warning' },
  [NotificationType.SAVED_SEARCH_MATCH]:  { icon: <StarIcon />,     color: 'secondary' },
};

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setNotifCount = useUiStore((s) => s.setNotificationCount);
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => notificationsApi.list({ page, limit: PAGE_SIZE }),
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      setNotifCount(0);
    },
  });

  const onClickNotification = (n: Notification) => {
    if (!n.readAt) markReadMutation.mutate([n.id]);
    const target = computeRoute(n);
    if (target) void navigate({ to: target as never });
  };

  const items = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.meta.totalPages ?? 1;

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('nav.notifications')} — {t('app.name')}</title>
      </Helmet>

      <Container maxWidth="md" disableGutters>
        <PageHeader
          title={t('nav.notifications')}
          action={
            <Button
              startIcon={<DoneAllIcon />}
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </Button>
          }
        />

        <Paper sx={{ overflow: 'hidden' }}>
          {listQuery.isLoading ? (
            [...Array(6)].map((_, i) => (
              <Box key={i} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Skeleton width="60%" />
                <Skeleton width="80%" />
              </Box>
            ))
          ) : items.length === 0 ? (
            <EmptyState title={t('empty.noNotifications')} />
          ) : (
            items.map((n) => {
              const meta = TYPE_META[n.type] ?? { icon: <MailIcon />, color: 'primary' as const };
              const unread = !n.readAt;
              return (
                <Box
                  key={n.id}
                  onClick={() => onClickNotification(n)}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: 1,
                    borderColor: 'divider',
                    borderInlineStart: 4,
                    borderInlineStartColor: unread ? 'primary.main' : 'transparent',
                    bgcolor: unread ? (theme) => alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                    '&:hover': { bgcolor: 'background.default' },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `${meta.color}.main`,
                      bgcolor: (theme) => alpha(theme.palette[meta.color].main, 0.12),
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography variant="subtitle2" sx={{ fontWeight: unread ? 700 : 600 }}>
                        {n.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.createdAt).toLocaleString(i18n.language)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {n.body}
                    </Typography>
                  </Box>
                  {unread && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate([n.id]);
                      }}
                      aria-label="mark read"
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })
          )}
        </Paper>

        {totalPages > 1 && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Pagination page={page} count={totalPages} onChange={(_, p) => setPage(p)} color="primary" />
          </Stack>
        )}
      </Container>
    </DashboardLayout>
  );
}

/** Maps a notification to the in-app route the user should land on when clicking it. */
function computeRoute(n: Notification): string | null {
  switch (n.type) {
    case NotificationType.INQUIRY_RECEIVED:
      return '/dashboard/inquiries';
    case NotificationType.MESSAGE_RECEIVED:
      return '/dashboard/messages';
    case NotificationType.LISTING_APPROVED:
    case NotificationType.LISTING_REJECTED:
    case NotificationType.LISTING_EXPIRING:
    case NotificationType.LISTING_EXPIRED: {
      const id = (n.data?.listingId as string | undefined) ?? null;
      return id ? `/listings/${id}` : '/dashboard/listings';
    }
    case NotificationType.PAYMENT_SUCCEEDED:
    case NotificationType.PAYMENT_FAILED:
      return '/dashboard/subscription';
    case NotificationType.SAVED_SEARCH_MATCH:
    case NotificationType.PRICE_DROP:
      return '/saved';
    default:
      return null;
  }
}
