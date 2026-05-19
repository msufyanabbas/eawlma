import {
  Badge,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import OverviewIcon from '@mui/icons-material/SpaceDashboardOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import ReportIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import HistoryIcon from '@mui/icons-material/History';
import CommissionIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PayoutsIcon from '@mui/icons-material/PaymentsOutlined';
import RequestIcon from '@mui/icons-material/HelpOutlineOutlined';
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMicOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { inquiriesApi } from '@/api/inquiries.api';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';

const SIDEBAR_WIDTH = 248;
// Same deeper brand-purple gradient as the agent dashboard — identity is
// shared between the two role surfaces, so they should look like siblings.
const SIDEBAR_GRADIENT =
  'linear-gradient(160deg, #4A3F8F 0%, #3D3570 40%, #2D2650 100%)';

interface AdminNavItem {
  to: string;
  i18nKey: string;
  icon: ReactNode;
  badgeKey?: 'disputes';
}

const ITEMS: AdminNavItem[] = [
  { to: '/admin', i18nKey: 'dashboard.overview', icon: <OverviewIcon /> },
  { to: '/admin/moderation', i18nKey: 'admin.moderationQueue', icon: <GavelIcon /> },
  { to: '/admin/users', i18nKey: 'admin.users', icon: <PeopleIcon /> },
  { to: '/admin/commissions', i18nKey: 'admin.commissions', icon: <CommissionIcon /> },
  { to: '/admin/payouts', i18nKey: 'admin.payouts', icon: <PayoutsIcon /> },
  { to: '/admin/property-requests', i18nKey: 'admin.propertyRequests', icon: <RequestIcon /> },
  { to: '/admin/promos', i18nKey: 'admin.promos', icon: <LocalOfferIcon /> },
  { to: '/admin/support', i18nKey: 'support.title', icon: <HeadsetMicIcon /> },
  { to: '/admin/disputes', i18nKey: 'admin.disputes', icon: <ReportIcon />, badgeKey: 'disputes' },
  { to: '/admin/audit', i18nKey: 'admin.audit', icon: <HistoryIcon /> },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const getRefreshToken = useAuthStore((s) => s.getRefreshToken);

  // Open-dispute count drives the sidebar badge. Stale-time of 60s keeps the
  // sidebar lively without hammering the endpoint on every navigation.
  const disputeCountQuery = useQuery({
    queryKey: ['inquiries', 'admin-disputes-count'],
    queryFn: () => inquiriesApi.adminCountDisputes(),
    staleTime: 60_000,
    retry: false,
  });
  const disputeCount = disputeCountQuery.data ?? 0;

  const handleSignOut = async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        /* best-effort */
      }
    }
    clearSession();
    void navigate({ to: '/' });
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ display: 'flex', minHeight: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 110px)' } }}>
        {/* Always emit LTR-style anchor + border. stylis-plugin-rtl flips
         *  these for us in RTL — manual branching produces a double-flip and
         *  lands the drawer on the wrong side. */}
        <Drawer
          variant="permanent"
          anchor="left"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              // Navbar is ~110px tall on md+ (toolbar 64 + category row ~46).
              top: 110,
              height: 'calc(100vh - 110px)',
              border: 'none',
              background: SIDEBAR_GRADIENT,
              color: '#FFFFFF',
            },
          }}
        >
          <Stack sx={{ height: '100%', pt: 2 }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                px: 3,
                pt: 0.5,
                pb: 1,
                fontWeight: 700,
              }}
            >
              {t('nav.admin')}
            </Typography>

            <List sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
              {ITEMS.map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/admin' && location.pathname.startsWith(item.to));
                return (
                  <Link key={item.to} to={item.to as never} style={{ textDecoration: 'none' }}>
                    <ListItemButton
                      selected={active}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255,255,255,0.15)',
                          color: '#FFFFFF',
                          '& .MuiListItemIcon-root': { color: '#FFFFFF' },
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        {item.badgeKey === 'disputes' && disputeCount > 0 ? (
                          <Badge
                            badgeContent={disputeCount}
                            color="error"
                            overlap="circular"
                            sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                          >
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={t(item.i18nKey)}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: active ? 700 : 500,
                          color: 'inherit',
                        }}
                      />
                    </ListItemButton>
                  </Link>
                );
              })}
            </List>

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
          </Stack>
        </Drawer>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}>
          <Stack spacing={3}>{children}</Stack>
        </Box>
      </Box>
    </Box>
  );
}
