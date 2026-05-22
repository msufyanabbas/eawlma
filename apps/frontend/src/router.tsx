import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { UserRole } from '@eawlma/shared-types';

import { AppShell } from './components/Layout/AppShell';
import { NotificationToaster } from './components/global/NotificationToaster';
import { SavedListingsHydrator } from './components/global/SavedListingsHydrator';
import { MeSyncer } from './components/global/MeSyncer';
import { ErrorBoundary } from './components/global/ErrorBoundary';
import { ScrollToTop } from './components/global/ScrollToTop';
import { PageviewTracker } from './components/global/PageviewTracker';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { AgentProfilePage } from './pages/AgentProfilePage';
import { AgentsPage } from './pages/AgentsPage';
import { SavedPropertiesPage } from './pages/SavedPropertiesPage';
import { ComparePage } from './pages/ComparePage';
import { MarketPage } from './pages/MarketPage';
import { MarketReportsPage } from './pages/MarketReportsPage';
import { StaysPage } from './pages/StaysPage';
import { HotelsPage } from './pages/HotelsPage';
import { HostingPage } from './pages/dashboard/HostingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { NafathCallbackPage } from './pages/auth/NafathCallbackPage';
import { MockNafathPage } from './pages/auth/MockNafathPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { MyListingsPage } from './pages/dashboard/MyListingsPage';
import { ListingWizardPage } from './pages/dashboard/ListingWizardPage';
import { ListingAnalyticsPage } from './pages/dashboard/ListingAnalyticsPage';
import { InquiriesPage } from './pages/dashboard/InquiriesPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { MessagesPage } from './pages/dashboard/MessagesPage';
import { NotificationsPage } from './pages/dashboard/NotificationsPage';
import { CommissionsPage } from './pages/dashboard/CommissionsPage';
import { WalletPage } from './pages/dashboard/WalletPage';
import { RentalContractsPage } from './pages/dashboard/RentalContractsPage';
import { DufaatPage } from './pages/dashboard/DufaatPage';
import { BookingsPage } from './pages/dashboard/BookingsPage';
import { BuyerDealsPage } from './pages/dashboard/BuyerDealsPage';
import { AdminDisputesPage } from './pages/admin/AdminDisputesPage';
import { AdminPromosPage } from './pages/admin/AdminPromosPage';
import { BookingPaymentCallbackPage } from './pages/BookingPaymentCallbackPage';
import { AdminCommissionsPage } from './pages/admin/AdminCommissionsPage';
import { AdminPayoutsPage } from './pages/admin/AdminPayoutsPage';
import { AdminPropertyRequestsPage } from './pages/admin/AdminPropertyRequestsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ModerationPage } from './pages/admin/ModerationPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { useAuthStore } from './store/auth.store';

// ----- Helpers ---------------------------------------------------------

const DASHBOARD_ROLES: UserRole[] = [UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN];
const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN];

const requireAuth = () => {
  if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/auth/login' });
};

const requireRole = (allowed: UserRole[]) => {
  return () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || !user) throw redirect({ to: '/auth/login' });
    if (!allowed.includes(user.role as UserRole)) throw redirect({ to: '/' });
  };
};

// Buyers (USER role) hitting /dashboard get sent to the messages page —
// the agent-flavoured overview is meaningless to them and the sidebar
// would only show the buyer-friendly items anyway.
const dashboardHomeRedirect = () => {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated || !user) throw redirect({ to: '/auth/login' });
  if (!DASHBOARD_ROLES.includes(user.role as UserRole)) {
    throw redirect({ to: '/dashboard/messages' });
  }
};

// ----- Root: bare passthrough + global side-effects -------------------
//
// The root route used to render `<AppShell>` directly, which meant /auth
// and /dashboard pages stacked the marketing Navbar on top of their own
// chrome. This version keeps the root pure — each section opts into the
// layout it wants via a parent layout-route below.
//
// `NotificationToaster` is mounted here so it shows on every authenticated
// page (it self-disables when unauthenticated).

const rootRoute = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <ScrollToTop />
      <PageviewTracker />
      <Outlet />
      <NotificationToaster />
      <SavedListingsHydrator />
      <MeSyncer />
    </ErrorBoundary>
  ),
  notFoundComponent: NotFoundPage,
});

// ----- Layout routes --------------------------------------------------

const marketingShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'marketing-shell',
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const authShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-shell',
  component: () => <Outlet />, // pages bring their own AuthLayout
});

// Dashboard shell only requires auth — buyer-only pages like /messages and
// /notifications mount here too, so we don't lock the entire subtree behind
// the agent role. Agent-specific routes opt in to the stricter role guard
// individually below.
const dashboardShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'dashboard-shell',
  beforeLoad: requireAuth,
  component: () => <Outlet />, // pages bring their own DashboardLayout
});

const requireAgentRole = requireRole(DASHBOARD_ROLES);

const adminShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin-shell',
  beforeLoad: requireRole(ADMIN_ROLES),
  component: () => <Outlet />, // pages bring their own AdminLayout
});

// ----- Public marketing routes ----------------------------------------

const indexRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/', component: HomePage });
const searchRoute = createRoute({
  getParentRoute: () => marketingShellRoute,
  path: '/search',
  validateSearch: (search): Record<string, unknown> => search as Record<string, unknown>,
  component: SearchPage,
});
const listingDetailRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/listings/$id', component: ListingDetailPage });
const agentsListRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/agents', component: AgentsPage });
const agentProfileRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/agents/$id', component: AgentProfilePage });
const savedRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/saved', component: SavedPropertiesPage });
const compareRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/compare', component: ComparePage });
const marketRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/market', component: MarketPage });
const marketReportsRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/market-reports', component: MarketReportsPage });
const staysRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/stays', component: StaysPage });
const hotelsRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/hotels', component: HotelsPage });
const profileRoute = createRoute({
  getParentRoute: () => marketingShellRoute,
  path: '/profile',
  beforeLoad: requireAuth,
  component: ProfilePage,
});
const bookingPaymentCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bookings/payment-callback',
  validateSearch: (search): Record<string, unknown> => search as Record<string, unknown>,
  component: BookingPaymentCallbackPage,
});

// ----- Footer / marketing static pages -------------------------------

const aboutRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/about', component: AboutPage });
const contactRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/contact', component: ContactPage });
const helpRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/help', component: HelpPage });
const privacyRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/privacy', component: PrivacyPolicyPage });
const termsRoute = createRoute({ getParentRoute: () => marketingShellRoute, path: '/terms', component: TermsPage });

// ----- Auth routes -----------------------------------------------------

const authLoginRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/login', component: LoginPage });
const authRegisterRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/register', component: RegisterPage });
const authVerifyRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/verify', component: VerifyOtpPage });
const authForgotRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/forgot-password', component: ForgotPasswordPage });
const authNafathCallbackRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/nafath-callback', component: NafathCallbackPage });
const authNafathMockRoute = createRoute({ getParentRoute: () => authShellRoute, path: '/auth/nafath-mock', component: MockNafathPage });

// ----- Legacy redirects ------------------------------------------------

const legacyLoginRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/login',
  beforeLoad: () => { throw redirect({ to: '/auth/login' }); },
  component: LoginPage,
});
const legacyRegisterRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/register',
  beforeLoad: () => { throw redirect({ to: '/auth/register' }); },
  component: RegisterPage,
});

// ----- Dashboard routes ------------------------------------------------

const dashboardHomeRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard', beforeLoad: dashboardHomeRedirect, component: DashboardHomePage });
const dashboardListingsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings', beforeLoad: requireAgentRole, component: MyListingsPage });
const dashboardListingNewRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/new', beforeLoad: requireAgentRole, component: ListingWizardPage });
const dashboardListingEditRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/$id/edit', beforeLoad: requireAgentRole, component: ListingWizardPage });
const dashboardListingAnalyticsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/listings/$id/analytics', beforeLoad: requireAgentRole, component: ListingAnalyticsPage });
const dashboardInquiriesRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/inquiries', beforeLoad: requireAgentRole, component: InquiriesPage });
// Messages + notifications are open to any authenticated user (buyer or agent).
const dashboardMessagesRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/messages', component: MessagesPage });
const dashboardNotificationsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/notifications', component: NotificationsPage });
const dashboardSubscriptionRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/subscription', beforeLoad: requireAgentRole, component: SubscriptionPage });
// Settings is open to any authenticated user (buyers and agents alike).
const dashboardSettingsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/settings', component: SettingsPage });
const dashboardCommissionsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/commissions', beforeLoad: requireAgentRole, component: CommissionsPage });
// Wallet is open to any authenticated user (buyers fund commission payments,
// agents collect their share into the same balance).
const dashboardWalletRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/wallet', component: WalletPage });
const dashboardContractsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/contracts', component: RentalContractsPage });
const dashboardDufaatRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/dufaat', component: DufaatPage });
const dashboardBookingsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/bookings', component: BookingsPage });
// "My Deals" is open to all authenticated users — buyers see pending deals to
// confirm/dispute; agents will see only confirmed/disputed/resolved entries
// where they were the buyer on another agent's listing (rare but possible).
const dashboardDealsRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/deals', component: BuyerDealsPage });
const dashboardHostingRoute = createRoute({ getParentRoute: () => dashboardShellRoute, path: '/dashboard/hosting', beforeLoad: requireAgentRole, component: HostingPage });

// `/messages` (top-level) is a friendlier alias for the same page — Navbar
// links to it from the public chat icon. It mounts under the dashboard
// shell so the role guard still applies.
const dashboardMessagesAliasRoute = createRoute({
  getParentRoute: () => dashboardShellRoute,
  path: '/messages',
  component: MessagesPage,
});
const userNotificationsAliasRoute = createRoute({
  getParentRoute: () => dashboardShellRoute,
  path: '/notifications',
  component: NotificationsPage,
});

// ----- Admin routes ---------------------------------------------------

const adminHomeRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin', component: AdminDashboardPage });
const adminModerationRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/moderation', component: ModerationPage });
const adminUsersRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/users', component: AdminUsersPage });
const adminAuditRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/audit', component: AuditLogPage });
const adminCommissionsRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/commissions', component: AdminCommissionsPage });
const adminPayoutsRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/payouts', component: AdminPayoutsPage });
const adminPropertyRequestsRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/property-requests', component: AdminPropertyRequestsPage });
const adminDisputesRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/disputes', component: AdminDisputesPage });
const adminPromosRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/promos', component: AdminPromosPage });
const adminSupportRoute = createRoute({ getParentRoute: () => adminShellRoute, path: '/admin/support', component: AdminSupportPage });

// ----- Tree -----------------------------------------------------------

const routeTree = rootRoute.addChildren([
  legacyLoginRoute,
  legacyRegisterRoute,
  bookingPaymentCallbackRoute,
  marketingShellRoute.addChildren([
    indexRoute,
    searchRoute,
    listingDetailRoute,
    agentsListRoute,
    agentProfileRoute,
    savedRoute,
    compareRoute,
    marketRoute,
    marketReportsRoute,
    staysRoute,
    hotelsRoute,
    profileRoute,
    aboutRoute,
    contactRoute,
    helpRoute,
    privacyRoute,
    termsRoute,
  ]),
  authShellRoute.addChildren([
    authLoginRoute,
    authRegisterRoute,
    authVerifyRoute,
    authForgotRoute,
    authNafathCallbackRoute,
    authNafathMockRoute,
  ]),
  dashboardShellRoute.addChildren([
    dashboardHomeRoute,
    dashboardListingsRoute,
    dashboardListingNewRoute,
    dashboardListingEditRoute,
    dashboardListingAnalyticsRoute,
    dashboardInquiriesRoute,
    dashboardMessagesRoute,
    dashboardNotificationsRoute,
    dashboardSubscriptionRoute,
    dashboardSettingsRoute,
    dashboardCommissionsRoute,
    dashboardWalletRoute,
    dashboardContractsRoute,
    dashboardDufaatRoute,
    dashboardBookingsRoute,
    dashboardDealsRoute,
    dashboardHostingRoute,
    dashboardMessagesAliasRoute,
    userNotificationsAliasRoute,
  ]),
  adminShellRoute.addChildren([
    adminHomeRoute,
    adminModerationRoute,
    adminUsersRoute,
    adminAuditRoute,
    adminCommissionsRoute,
    adminPayoutsRoute,
    adminPropertyRequestsRoute,
    adminDisputesRoute,
    adminPromosRoute,
    adminSupportRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: false,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
