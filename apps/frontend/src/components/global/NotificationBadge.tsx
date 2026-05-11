import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { notificationsApi } from '@/api/notifications.api';
import { getMessagingSocket } from '@/api/realtime';

/**
 * Bell icon with unread-count badge. Hydrates from the REST API and listens
 * to the `/messaging` Socket.IO namespace for live `notification:created`
 * events. Updates the global uiStore so other components (e.g. mobile menu)
 * can mirror the count.
 */
export function NotificationBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setNotificationCount = useUiStore((s) => s.setNotificationCount);
  const incrementNotificationCount = useUiStore((s) => s.incrementNotificationCount);
  const count = useUiStore((s) => s.notificationCount);
  const wiredSocket = useRef(false);

  // Initial hydrate via REST.
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const c = await notificationsApi.unreadCount();
      setNotificationCount(c);
      return c;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // Live updates over Socket.IO. The /messaging namespace echoes a
  // `notification:created` event for the recipient's user-room.
  useEffect(() => {
    if (!isAuthenticated || wiredSocket.current) return;
    const socket = getMessagingSocket();
    const onNotification = () => incrementNotificationCount(1);
    socket.on('notification:created', onNotification);
    wiredSocket.current = true;
    return () => {
      socket.off('notification:created', onNotification);
      wiredSocket.current = false;
    };
  }, [isAuthenticated, incrementNotificationCount]);

  if (!isAuthenticated) return null;

  return (
    <Tooltip title={t('nav.notifications')}>
      <IconButton onClick={() => navigate({ to: '/dashboard/notifications' as never })} aria-label="notifications">
        <Badge badgeContent={count} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
