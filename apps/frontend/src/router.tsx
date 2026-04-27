import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { UserRole } from '@aqarat/shared-types';

import { AppShell } from './components/Layout/AppShell';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { AgentProfilePage } from './pages/AgentProfilePage';
import { SavedPropertiesPage } from './pages/SavedPropertiesPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { MyListingsPage } from './pages/dashboard/MyListingsPage';
import { ListingWizardPage } from './pages/dashboard/ListingWizardPage';
import { ListingAnalyticsPage } from './pages/dashboard/ListingAnalyticsPage';
import { InquiriesPage } from './pages/dashboard/InquiriesPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { useAuthStore } from './store/auth.store';

// ----- Helpers ---------------------------------------------------------

const DASHBOARD_ROLES: UserRole[] = [UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN];

/** Throws a redirect when the current user is missing or not in the allowed list. */
const requireRole = (allowed: UserRole[]) => {
  return () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      throw redirect({ to: '/auth/login' });
    }
    if (!allowed.includes(user.role as UserRole)) {
      throw redirect({ to: '/' });
    }
  };
};

// ----- Root + layouts --------------------------------------------------

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: NotFoundPage,
});

// `BareLayout` skips the marketing navbar/footer (used by /auth + /dashboard
// — dashboard pages mount DashboardLayout themselves).
const BareLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

const authShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-shell',
  component: () => (
    <BareLayout>
      <Outlet />
    </BareLayout>
  ),
});

const dashboardShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'dashboard-shell',
  beforeLoad: requireRole(DASHBOARD_ROLES),
  component: () => (
    <BareLayout>
      <Outlet />
    </BareLayout>
  ),
});

// ----- Public marketing routes ----------------------------------------

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (search): Record<string, unknown> => search as Record<string, unknown>,
  component: SearchPage,
});
const listingDetailRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/listings/$id', component: ListingDetailPage,
});
const agentProfileRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/agents/$id', component: AgentProfilePage,
});
const savedRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/saved', component: SavedPropertiesPage,
});

// ----- Auth routes ----------------------------------------------------

const authLoginRoute = createRoute({
  getParentRoute: () => authShellRoute, path: '/auth/login', component: LoginPage,
});
const authRegisterRoute = createRoute({
  getParentRoute: () => authShellRoute, path: '/auth/register', component: RegisterPage,
});
const authVerifyRoute = createRoute({
  getParentRoute: () => authShellRoute, path: '/auth/verify', component: VerifyOtpPage,
});
const authForgotRoute = createRoute({
  getParentRoute: () => authShellRoute, path: '/auth/forgot-password', component: ForgotPasswordPage,
});

// ----- Legacy redirects ------------------------------------------------

const legacyLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => { throw redirect({ to: '/auth/login' }); },
  component: LoginPage,
});
const legacyRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: () => { throw redirect({ to: '/auth/register' }); },
  component: RegisterPage,
});

// ----- User-side authenticated routes ---------------------------------

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/auth/login' });
  },
  component: ProfilePage,
});

// ----- Dashboard routes (agent / agency_admin / admin) ----------------

const dashboardHomeRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard', component: DashboardHomePage,
});
const dashboardListingsRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings', component: MyListingsPage,
});
const dashboardListingNewRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/new', component: ListingWizardPage,
});
const dashboardListingEditRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/$id/edit', component: ListingWizardPage,
});
const dashboardListingAnalyticsRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/$id/analytics', component: ListingAnalyticsPage,
});
const dashboardInquiriesRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/inquiries', component: InquiriesPage,
});
const dashboardSubscriptionRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/subscription', component: SubscriptionPage,
});
const dashboardSettingsRoute = createRoute({
  getParentRoute: () => dashboardShellRoute, path: '/dashboard/settings', component: SettingsPage,
});

// ----- Tree -----------------------------------------------------------

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  listingDetailRoute,
  agentProfileRoute,
  savedRoute,
  profileRoute,
  legacyLoginRoute,
  legacyRegisterRoute,
  authShellRoute.addChildren([
    authLoginRoute,
    authRegisterRoute,
    authVerifyRoute,
    authForgotRoute,
  ]),
  dashboardShellRoute.addChildren([
    dashboardHomeRoute,
    dashboardListingsRoute,
    dashboardListingNewRoute,
    dashboardListingEditRoute,
    dashboardListingAnalyticsRoute,
    dashboardInquiriesRoute,
    dashboardSubscriptionRoute,
    dashboardSettingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
