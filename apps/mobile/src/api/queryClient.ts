import { QueryClient } from '@tanstack/react-query';

// Singleton TanStack Query client. Exposed via module scope (not React
// context) so non-component callers — the i18n `changeLanguage` helper,
// background sync handlers, etc. — can invalidate caches without going
// through `useQueryClient()`.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
