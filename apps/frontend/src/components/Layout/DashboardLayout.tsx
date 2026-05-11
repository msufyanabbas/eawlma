import {
  Avatar,
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import OverviewIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ListingsIcon from '@mui/icons-material/Apartment';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import InquiryIcon from '@mui/icons-material/MailOutline';
import MessagesIcon from '@mui/icons-material/ChatBubbleOutline';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import SubscriptionIcon from '@mui/icons-material/CardMembershipOutlined';
import CommissionIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import WalletIcon from '@mui/icons-material/SavingsOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ContractIcon from '@mui/icons-material/ArticleOutlined';
import DufaatIcon from '@mui/icons-material/CreditCardOutlined';
import BookingIcon from '@mui/icons-material/EventAvailableOutlined';
import HostingIcon from '@mui/icons-material/CottageOutlined';
import DealsIcon from '@mui/icons-material/HandshakeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ReactNode } from 'react';
import { UserRole } from '@eawlma/shared-types';
import { Navbar } from './Navbar';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';

const AGENT_ROLES = new Set<UserRole>([UserRole.AGENT, UserRole.AGENCY_ADMIN, UserRole.ADMIN]);

import logoUrl from '@/assets/logo.svg';

const SIDEBAR_WIDTH = 240;

interface NavItem {
  to: string;
  i18nKey: string;
  icon: ReactNode;
  agentOnly?: boolean;
  /** When true, the item is active only on an exact-path match — used for
   *  `/dashboard` (otherwise it'd match every nested route) and for
   *  `/dashboard/listings/new` (otherwise it'd overlap `/dashboard/listings`). */
  exactOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { to: '/dashboard', i18nKey: 'dashboard.overview', icon: <OverviewIcon />, agentOnly: true, exactOnly: true },
  { to: '/dashboard/listings', i18nKey: 'dashboard.listings', icon: <ListingsIcon />, agentOnly: true },
  { to: '/dashboard/listings/new', i18nKey: 'dashboard.newListing', icon: <AddIcon />, agentOnly: true, exactOnly: true },
  { to: '/dashboard/inquiries', i18nKey: 'dashboard.inquiries', icon: <InquiryIcon />, agentOnly: true },
  { to: '/dashboard/messages', i18nKey: 'dashboard.messages', icon: <MessagesIcon /> },
  { to: '/dashboard/notifications', i18nKey: 'nav.notifications', icon: <NotificationsIcon /> },
  { to: '/dashboard/subscription', i18nKey: 'dashboard.subscription', icon: <SubscriptionIcon />, agentOnly: true },
  { to: '/dashboard/commissions', i18nKey: 'dashboard.commissions', icon: <CommissionIcon />, agentOnly: true },
  { to: '/dashboard/wallet', i18nKey: 'wallet.title', icon: <WalletIcon /> },
  { to: '/dashboard/contracts', i18nKey: 'ejar.myContracts', icon: <ContractIcon /> },
  { to: '/dashboard/dufaat', i18nKey: 'dufaat.title', icon: <DufaatIcon /> },
  { to: '/dashboard/bookings', i18nKey: 'booking.myBookings', icon: <BookingIcon /> },
  // Hosting dashboard — only useful for hosts (agents/agency-admins).
  { to: '/dashboard/hosting', i18nKey: 'hosting.title', icon: <HostingIcon />, agentOnly: true },
  // Open to every authenticated user — buyers confirm/dispute deals here,
  // agents who also buy property would see their own buyer-side deals.
  { to: '/dashboard/deals', i18nKey: 'buyerDeals.title', icon: <DealsIcon /> },
  { to: '/dashboard/settings', i18nKey: 'dashboard.settings', icon: <SettingsIcon /> },
  { to: '/profile', i18nKey: 'nav.profile', icon: <PersonIcon /> },
];

// One sx object per state — applied wholesale per item so we never end up
// with a half-styled row (e.g. active background + inactive text colour).
const NAV_ITEM_BASE = {
  py: 1.25,
  px: 3,
  mb: 0.25,
  cursor: 'pointer',
  borderRadius: '0 24px 24px 0',
  mr: 1.5,
  transition: 'background-color 0.2s ease, color 0.2s ease',
} as const;

const NAV_ITEM_ACTIVE = {
  ...NAV_ITEM_BASE,
  color: '#FFFFFF',
  bgcolor: 'rgba(255,255,255,0.15)',
  fontWeight: 700,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
} as const;

const NAV_ITEM_INACTIVE = {
  ...NAV_ITEM_BASE,
  color: 'rgba(255,255,255,0.7)',
  bgcolor: 'transparent',
  fontWeight: 500,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' },
} as const;

/**
 * Resolve which single nav item should be highlighted for the current path.
 *
 * Rule of precedence (one winner per render):
 *   1. Exact `path === item.to` match always wins. This is how
 *      /dashboard/listings/new (exact-only) wins over /dashboard/listings
 *      (prefix-matchable).
 *   2. Otherwise, longest prefix match — `path.startsWith(item.to + '/')` —
 *      among items that are NOT marked exactOnly. `/dashboard` is exact-only
 *      so it never lights up under nested routes.
 */
function findActiveItem(path: string, items: NavItem[]): NavItem | null {
  const exact = items.find((i) => i.to === path);
  if (exact) return exact;
  let best: NavItem | null = null;
  for (const it of items) {
    if (it.exactOnly) continue;
    if (path.startsWith(it.to + '/')) {
      if (!best || it.to.length > best.to.length) best = it;
    }
  }
  return best;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const getRefreshToken = useAuthStore((s) => s.getRefreshToken);
  const isAgent = user ? AGENT_ROLES.has(user.role as UserRole) : false;

  const handleSignOut = async () => {
    const rt = getRefreshToken();
    if (rt) {
      try { await authApi.logout(rt); } catch { /* best-effort */ }
    }
    clearSession();
    void navigate({ to: '/' });
  };

  const sidebarContent = (
    <Stack
      sx={{
        height: '100%',
        // Softer lavender-purple sidebar — matches the brand instead of
        // near-black navy.
        background: 'linear-gradient(180deg, #2D2650 0%, #3D3570 100%)',
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      {/* Brand block */}
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2.5, px: 3 }}>
        <Box component="img" src={logoUrl} alt="Eawlma" sx={{ height: 32, width: 32, filter: 'brightness(1.1)' }} />
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
          Eawlma
        </Typography>
      </Stack>

      {/* User info block (top of sidebar) */}
      {user && (
        <Box
          sx={{
            p: 2.5,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            mb: 1,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              src={user.avatarUrl ?? undefined}
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.main',
                color: '#1A1A2E',
                fontWeight: 700,
              }}
            >
              {user.firstName?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}
                noWrap
              >
                {user.firstName} {user.lastName}
              </Typography>
              <Typography
                sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}
                noWrap
              >
                {user.role === UserRole.ADMIN
                  ? t('nav.admin')
                  : isAgent
                    ? t('listing.agent', { defaultValue: 'Agent' })
                    : t('nav.profile')}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Typography
        sx={{
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          px: 3,
          pt: 1,
          pb: 1,
        }}
      >
        {t('nav.dashboard')}
      </Typography>

      {/* Nav items — buyers see only the public-friendly ones (messages,
       *  notifications, settings, profile); agents see the full set. The
       *  active item is computed once via findActiveItem so exactly one row
       *  lights up — no overlapping highlights on nested routes. */}
      <Box component="nav" sx={{ flex: 1, py: 0.5 }}>
        {(() => {
          const visibleItems = ITEMS.filter((item) => !item.agentOnly || isAgent);
          const activeItem = findActiveItem(location.pathname, visibleItems);
          return visibleItems.map((item) => {
            const isActiveItem = activeItem?.to === item.to;
            return (
              <Link key={item.to} to={item.to as never} style={{ textDecoration: 'none' }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={isActiveItem ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      mr: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '& svg': { fontSize: 22 },
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 'inherit', color: 'inherit' }}>
                    {t(item.i18nKey)}
                  </Typography>
                </Stack>
              </Link>
            );
          });
        })()}
      </Box>

      {/* Bottom: sign-out only — user identity already lives at the top. */}
      {user && (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
            onClick={handleSignOut}
            sx={{
              color: 'rgba(255,255,255,0.9) !important',
              borderColor: 'rgba(255,255,255,0.3) !important',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.6) !important',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            {t('nav.logout')}
          </Button>
        </Box>
      )}
    </Stack>
  );

  // IMPORTANT: do NOT branch on `theme.direction` to flip `anchor` / `left` /
  // `ml` here. stylis-plugin-rtl (cssjanus) already flips every `left/right/
  // margin-left/margin-right` declaration when the emotion cache is in RTL
  // mode. Writing `anchor="right"` + `right: 0` + `mr: 240` in RTL gets
  // double-flipped and the drawer lands on the LEFT side.
  //
  // The correct pattern: always emit LTR coordinates and let cssjanus do its
  // single flip in RTL.
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Navbar />
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        anchor="left"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            left: 0,
            top: { md: 110 },
            height: { md: 'calc(100vh - 110px)' },
            // Force the dark lavender gradient regardless of the active theme
            // mode so sidebar text stays legibly white in both light and dark.
            background: 'linear-gradient(180deg, #2D2650 0%, #3D3570 100%)',
            color: '#FFFFFF',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          p: { xs: 2, md: 3 },
          minHeight: 'calc(100vh - 72px)',
          minWidth: 0,
        }}
      >
        <Stack spacing={3}>{children}</Stack>
      </Box>
    </Box>
  );
}
