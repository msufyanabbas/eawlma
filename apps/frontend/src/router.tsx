import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

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
import { useAuthStore } from './store/auth.store';

// ----- Root + layout ----------------------------------------------------

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: NotFoundPage,
});

// `BareLayout` is used by /auth/* routes which render their own AuthLayout
// shell — they don't want the marketing navbar/footer.
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

// ----- Public marketing routes -----------------------------------------

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (search): Record<string, unknown> => search as Record<string, unknown>,
  component: SearchPage,
});

const listingDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/listings/$id',
  component: ListingDetailPage,
});

const agentProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents/$id',
  component: AgentProfilePage,
});

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/saved',
  component: SavedPropertiesPage,
});

// ----- Auth routes (under /auth) ---------------------------------------

const authLoginRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/auth/login',
  component: LoginPage,
});

const authRegisterRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/auth/register',
  component: RegisterPage,
});

const authVerifyRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/auth/verify',
  component: VerifyOtpPage,
});

const authForgotRoute = createRoute({
  getParentRoute: () => authShellRoute,
  path: '/auth/forgot-password',
  component: ForgotPasswordPage,
});

// ----- Legacy aliases — bounce /login + /register to the new paths -----

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

// ----- Authenticated routes --------------------------------------------

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/auth/login' });
    }
  },
  component: ProfilePage,
});

// ----- Tree -------------------------------------------------------------

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
