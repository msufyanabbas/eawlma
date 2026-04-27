import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Wraps a route's component and bounces unauthenticated visitors to /login.
 *
 * Routes that need a return-to-after-login URL should use TanStack Router's
 * `beforeLoad` hook with `redirect()` — see `routes/profile.tsx` for the
 * pattern. This component is a simple catch-all for client-side guards.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
