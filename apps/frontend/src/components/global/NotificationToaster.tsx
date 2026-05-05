import {
  Alert,
  Box,
  IconButton,
  Slide,
  type SlideProps,
  Snackbar,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MailIcon from '@mui/icons-material/MailOutline';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { type Notification } from '@eawlma/shared-types';
import { notificationsApi } from '@/api/notifications.api';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

const POLL_MS = 20_000;

/**
 * Mounted once at app root. Polls the unread-count + most-recent notification
 * every {@link POLL_MS} milliseconds; when a new notification arrives we show
 * a Snackbar toast with a "View" action that routes to the appropriate page.
 *
 * The polling fallback is intentional: the Socket.IO `/messaging` namespace
 * doesn't currently emit `notification:created`, so we don't rely on it.
 * Once that event is added on the backend, swap to a socket listener and
 * keep the polling as a long-window safety net.
 */
export function NotificationToaster() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setCount = useUiStore((s) => s.setNotificationCount);
  const lastSeenIdRef = useRef<string | null>(null);
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const [count, listPage] = await Promise.all([
          notificationsApi.unreadCount(),
          notificationsApi.list({ page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        setCount(count);

        const newest = listPage.data?.[0];
        if (newest && lastSeenIdRef.current && newest.id !== lastSeenIdRef.current && !newest.readAt) {
          // Only show a toast on real *new* arrivals (not on first hydrate).
          setToast(newest);
          // Pre-warm the notifications cache so the page is ready when clicked.
          void qc.invalidateQueries({ queryKey: ['notifications'] });
        }
        lastSeenIdRef.current = newest?.id ?? lastSeenIdRef.current;
      } catch {
        // Failures are non-fatal; we'll try again next interval.
      }
    };

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated, qc, setCount]);

  const handleView = () => {
    if (!toast) return;
    setToast(null);
    void navigate({ to: '/dashboard/notifications' as never });
  };

  if (!isAuthenticated) return null;

  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={6000}
      onClose={() => setToast(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={(props: SlideProps) => <Slide {...props} direction="left" />}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          alignItems: 'flex-start',
          minWidth: 320,
          maxWidth: 420,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.95),
        }}
        icon={<MailIcon />}
        action={
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" color="inherit" onClick={handleView}><OpenInNewIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="inherit" onClick={() => setToast(null)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        }
      >
        <Box sx={{ pe: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{toast?.title}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>{toast?.body}</Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
}
