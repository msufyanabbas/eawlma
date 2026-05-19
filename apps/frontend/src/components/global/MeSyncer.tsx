import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import i18n from '@/i18n';
import { syncMeToClient, usersApi } from '@/api/users.api';
import { getMessagingSocket } from '@/api/realtime';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';

const REFETCH_MS = 30_000;
const STALE_MS = 20_000;

/**
 * Mounted once at app root. Keeps the React Query cache, Zustand auth store
 * AND user-visible UI state (i18n locale + theme) in sync with /users/me so
 * a preference saved on another device shows up here without a re-login.
 *
 * Three triggers feed the same pipeline:
 *
 *   1. A 30s background refetch (paused when unauthenticated).
 *   2. A `profile_updated` WebSocket event from the backend — fires the
 *      moment another tab/device saves an avatar or preference change.
 *   3. Manual mutations via `usersApi.updateMe` / `updatePreferences`,
 *      which already push the response through `syncMeToClient`.
 *
 * When the fetched user's `preferredLocale` / `preferredTheme` differ from
 * the local Zustand UI state, we apply them via the store's plain setters
 * with `userId = null`. The `null` is load-bearing: it tells `setLanguage`
 * / `setThemeMode` to skip the backend write-back, otherwise every cross-
 * device refetch would echo back into a PATCH and re-trigger the WS event.
 */
export function MeSyncer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? REFETCH_MS : false,
    refetchIntervalInBackground: false,
    staleTime: STALE_MS,
  });

  useEffect(() => {
    if (!me) return;
    syncMeToClient(me);

    // Apply locale changes — `i18n.changeLanguage` swaps the active language
    // and the store setter (with null userId) updates the persisted UI state
    // without re-issuing PATCH /users/me/preferences.
    if (me.preferredLocale && me.preferredLocale !== i18n.language) {
      void i18n.changeLanguage(me.preferredLocale);
      setLanguage(me.preferredLocale, null);
    }

    // Apply theme changes — same idempotency rule: only call the setter when
    // the value differs so we don't churn Zustand subscribers each refetch.
    if (me.preferredTheme && me.preferredTheme !== useUiStore.getState().themeMode) {
      setThemeMode(me.preferredTheme, null);
    }
  }, [me, setLanguage, setThemeMode]);

  // Backend-emitted `profile_updated` is the low-latency path — useQuery's
  // 30s poll is the safety net. The handler just invalidates the cache;
  // useQuery refetches, then the effect above re-applies prefs.
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
