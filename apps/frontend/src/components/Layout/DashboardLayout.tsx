import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from '@tanstack/react-router';
import OverviewIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ListingsIcon from '@mui/icons-material/Apartment';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import InquiryIcon from '@mui/icons-material/MailOutline';
import MessagesIcon from '@mui/icons-material/ChatBubbleOutline';
import AnalyticsIcon from '@mui/icons-material/InsightsOutlined';
import SubscriptionIcon from '@mui/icons-material/CardMembershipOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { useUiStore } from '@/store/ui.store';

const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 72;

interface NavItem {
  to: string;
  i18nKey: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  { to: '/agent', i18nKey: 'dashboard.overview', icon: <OverviewIcon /> },
  { to: '/agent/listings', i18nKey: 'dashboard.listings', icon: <ListingsIcon /> },
  { to: '/agent/listings/new', i18nKey: 'dashboard.newListing', icon: <AddIcon /> },
  { to: '/agent/inquiries', i18nKey: 'dashboard.inquiries', icon: <InquiryIcon /> },
  { to: '/messages', i18nKey: 'dashboard.messages', icon: <MessagesIcon /> },
  { to: '/agent/analytics', i18nKey: 'dashboard.analytics', icon: <AnalyticsIcon /> },
  { to: '/agent/subscription', i18nKey: 'dashboard.subscription', icon: <SubscriptionIcon /> },
  { to: '/agent/payments', i18nKey: 'dashboard.payments', icon: <PaymentsIcon /> },
  { to: '/agent/settings', i18nKey: 'dashboard.settings', icon: <SettingsIcon /> },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const location = useLocation();

  const width = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
  const isRtl = theme.direction === 'rtl';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          anchor={isRtl ? 'right' : 'left'}
          open={isDesktop ? true : sidebarOpen}
          onClose={() => toggleSidebar()}
          sx={{
            width,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width,
              boxSizing: 'border-box',
              borderRight: isRtl ? 0 : 1,
              borderLeft: isRtl ? 1 : 0,
              borderColor: 'divider',
              top: { md: 64 },
              height: { md: 'calc(100vh - 64px)' },
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.standard,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar sx={{ px: 1, justifyContent: sidebarOpen ? 'space-between' : 'center', minHeight: 56 }}>
            {sidebarOpen && (
              <Typography variant="overline" color="text.secondary" sx={{ pl: 1 }}>
                {t('nav.dashboard')}
              </Typography>
            )}
            <Tooltip title={sidebarOpen ? '' : t('nav.dashboard')}>
              <IconButton onClick={toggleSidebar} size="small">
                {sidebarOpen
                  ? (isRtl ? <ChevronRightIcon /> : <ChevronLeftIcon />)
                  : (isRtl ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
              </IconButton>
            </Tooltip>
          </Toolbar>
          <List sx={{ p: 1 }}>
            {ITEMS.map((item) => {
              const active = location.pathname === item.to ||
                (item.to !== '/agent' && location.pathname.startsWith(item.to));
              return (
                <Link key={item.to} to={item.to as never} style={{ textDecoration: 'none' }}>
                  <ListItemButton
                    selected={active}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: active ? 'inherit' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    {sidebarOpen && (
                      <ListItemText
                        primary={t(item.i18nKey)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 700 : 500 }}
                      />
                    )}
                  </ListItemButton>
                </Link>
              );
            })}
          </List>
        </Drawer>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}>
          <Stack spacing={3}>{children}</Stack>
        </Box>
      </Box>
    </Box>
  );
}
