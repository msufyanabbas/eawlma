import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from '@tanstack/react-router';
import OverviewIcon from '@mui/icons-material/SpaceDashboardOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import HistoryIcon from '@mui/icons-material/History';
import CommissionIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PayoutsIcon from '@mui/icons-material/PaymentsOutlined';
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

const SIDEBAR_WIDTH = 248;

const ITEMS = [
  { to: '/admin', i18nKey: 'dashboard.overview', icon: <OverviewIcon /> },
  { to: '/admin/moderation', i18nKey: 'admin.moderationQueue', icon: <GavelIcon /> },
  { to: '/admin/users', i18nKey: 'admin.users', icon: <PeopleIcon /> },
  { to: '/admin/commissions', i18nKey: 'admin.commissions', icon: <CommissionIcon /> },
  { to: '/admin/payouts', i18nKey: 'admin.payouts', icon: <PayoutsIcon /> },
  { to: '/admin/audit', i18nKey: 'admin.audit', icon: <HistoryIcon /> },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const location = useLocation();
  const isRtl = theme.direction === 'rtl';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <Drawer
          variant="permanent"
          anchor={isRtl ? 'right' : 'left'}
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              top: 64,
              height: 'calc(100vh - 64px)',
              borderRight: isRtl ? 0 : 1,
              borderLeft: isRtl ? 1 : 0,
              borderColor: 'divider',
            },
          }}
        >
          <Toolbar sx={{ px: 2, minHeight: 56 }}>
            <Typography variant="overline" color="text.secondary">
              {t('nav.admin')}
            </Typography>
          </Toolbar>
          <List sx={{ p: 1 }}>
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
                      '&.Mui-selected': {
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        '& .MuiListItemIcon-root': { color: 'secondary.contrastText' },
                        '&:hover': { bgcolor: 'secondary.dark' },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{ minWidth: 36, color: active ? 'inherit' : 'text.secondary' }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.i18nKey)}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 700 : 500 }}
                    />
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
