import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

/**
 * Mounted once at the app root. When the user is authenticated, hydrates the
 * saved-listings store from the server so the heart icons across the app
 * (HomePage, Search, Listing detail) reflect the right state on first paint.
 *
 * No-op when unauthenticated — the store keeps its localStorage values for
 * anonymous favoriting.
 */
export function SavedListingsHydrator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useSavedStore((s) => s.hydrate);

  useEffect(() => {
    if (isAuthenticated) void hydrate();
  }, [isAuthenticated, hydrate]);

  return null;
}
