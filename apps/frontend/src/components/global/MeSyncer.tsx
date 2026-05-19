import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { syncMeToClient, usersApi } from '@/api/users.api';
import { getMessagingSocket } from '@/api/realtime';
import { useAuthStore } from '@/store/auth.store';

const REFETCH_MS = 30_000;
const STALE_MS = 20_000;

/**
 * Mounted once at app root. Keeps the React Query cache + Zustand auth store
 * in sync with /users/me without requiring a re-login. Three triggers feed
 * the same `syncMeToClient` pipeline:
 *
 *   1. A 30s background refetch (paused when unauthenticated).
 *   2. A `profile_updated` WebSocket event from the backend — fires the
 *      moment another tab/device saves an avatar or preference change.
 *   3. Manual mutations via `usersApi.updateMe` / `updatePreferences`,
 *      which already push the response through `syncMeToClient`.
 */
export function MeSyncer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? REFETCH_MS : false,
    refetchIntervalInBackground: false,
    staleTime: STALE_MS,
  });

  // Project the fresh User into the auth store every time the query refreshes.
  // setUser is idempotent against unchanged data — Zustand only notifies
  // subscribers when the reference changes.
  useEffect(() => {
    if (me) syncMeToClient(me);
  }, [me]);

  // Listen for the backend-emitted `profile_updated` socket event. The
  // messaging socket is the only one the app keeps open today, so we re-use
  // it for user-scoped events too. The handler simply invalidates the cache;
  // useQuery refetches, then the useEffect above re-projects into the store.
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getMessagingSocket();
    const handler = () => {
      void qc.invalidateQueries({ queryKey: ['users', 'me'] });
    };
    socket.on('profile_updated', handler);
    return () => {
      socket.off('profile_updated', handler);
    };
  }, [isAuthenticated, qc]);

  return null;
}
