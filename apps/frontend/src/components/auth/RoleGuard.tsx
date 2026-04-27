import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { UserRole } from '@aqarat/shared-types';
import { useAuthStore } from '@/store/auth.store';

interface RoleGuardProps {
  /** Allowed roles. Matches the user's current role exactly. */
  allow: UserRole[];
  children: ReactNode;
  /** Where to send disallowed users. Defaults to "/". */
  fallback?: string;
}

/**
 * Allows the wrapped element to render only if the current user's role is in
 * `allow`. Unauthenticated users are routed to `/login`; authenticated users
 * with the wrong role are routed to `fallback` (default `/`).
 */
export function RoleGuard({ allow, children, fallback = '/' }: RoleGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(user.role as UserRole)) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
