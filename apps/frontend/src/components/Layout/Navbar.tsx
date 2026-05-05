import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LanguageIcon from '@mui/icons-material/Language';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import logoUrl from '@/assets/logo.svg';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserRole } from '@eawlma/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { authApi } from '@/api/auth.api';
import { NotificationBadge } from '@/components/global/NotificationBadge';

interface NavbarProps {
  onMobileMenuClick?: () => void;
}

export function Navbar({ onMobileMenuClick }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const { user, isAuthenticated, clearSession, getRefreshToken } = useAuthStore();
  const setLanguage = useUiStore((s) => s.setLanguage);
  const themeMode = useUiStore((s) => s.themeMode);
  const toggleThemeMode = useUiStore((s) => s.toggleThemeMode);
  const unreadMessageCount = useUiStore((s) => s.unreadMessageCount);

  const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Toggle the glass-frosted look once the user scrolls past the hero band.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLanguage = (lng: 'ar' | 'en') => {
    void i18n.changeLanguage(lng);
    setLanguage(lng);
    localStorage.setItem('eawlma.locale', lng);
    setLangAnchor(null);
  };

  const handleLogout = async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // sign-out is best-effort; ignore network errors
      }
    }
    clearSession();
    setUserAnchor(null);
    void navigate({ to: '/' });
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    void navigate({ to: '/search', search: { q } as never });
  };

  const isAgent =
    user?.role === UserRole.AGENT || user?.role === UserRole.AGENCY_ADMIN;
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: scrolled ? 'rgba(255,255,255,0.85)' : 'background.paper',
        backdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
        borderBottom: 1,
        borderColor: scrolled ? 'rgba(108,99,166,0.15)' : 'divider',
        transition: 'background-color 220ms ease, border-color 220ms ease, backdrop-filter 220ms ease',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, py: 1 }}>
          {/* Mobile hamburger */}
          {!isDesktop && (
            <IconButton edge="start" onClick={onMobileMenuClick} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box
                component="img"
                src={logoUrl}
                alt={t('app.name')}
                sx={{ height: 36, width: 36, display: 'block' }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  letterSpacing: -0.5,
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {t('app.name')}
              </Typography>
            </Stack>
          </Link>

          {/* Search bar — centered, max 480px on desktop; icon-only on mobile */}
          {isDesktop ? (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                mx: 2,
              }}
            >
              <TextField
                size="small"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 999,
                    bgcolor: 'grey.50',
                    pl: 0.5,
                    pr: 1,
                    height: 40,
                  },
                }}
                sx={{ width: '100%', maxWidth: 480 }}
              />
            </Box>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}

          {/* Right cluster */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
            {!isDesktop && (
              <Tooltip title={t('common.search')}>
                <IconButton
                  onClick={() => setMobileSearchOpen((v) => !v)}
                  aria-label="search"
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={t(themeMode === 'dark' ? 'common.lightMode' : 'common.darkMode')}>
              <IconButton onClick={toggleThemeMode} aria-label="toggle theme">
                {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={t('common.language')}>
              <IconButton
                onClick={(e: MouseEvent<HTMLButtonElement>) => setLangAnchor(e.currentTarget)}
                aria-label="language"
              >
                <LanguageIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={langAnchor} open={!!langAnchor} onClose={() => setLangAnchor(null)}>
              <MenuItem selected={i18n.language === 'ar'} onClick={() => switchLanguage('ar')}>
                {t('common.arabic')}
              </MenuItem>
              <MenuItem selected={i18n.language === 'en'} onClick={() => switchLanguage('en')}>
                {t('common.english')}
              </MenuItem>
            </Menu>

            {isAuthenticated && user ? (
              <>
                <Tooltip title={t('nav.messages')}>
                  <IconButton
                    onClick={() => navigate({ to: '/messages' as never })}
                    aria-label="messages"
                  >
                    <Badge badgeContent={unreadMessageCount} color="error">
                      <ChatBubbleIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <NotificationBadge />

                <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar
                    src={user.avatarUrl ?? undefined}
                    alt={user.firstName}
                    sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                  >
                    {user.firstName?.[0]}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={userAnchor}
                  open={!!userAnchor}
                  onClose={() => setUserAnchor(null)}
                  PaperProps={{ sx: { minWidth: 220, mt: 1, borderRadius: 2 } }}
                >
                  <Box sx={{ px: 2, py: 1.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { setUserAnchor(null); void navigate({ to: '/profile' }); }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('nav.profile')}
                  </MenuItem>
                  {isAgent && (
                    <MenuItem
                      onClick={() => { setUserAnchor(null); void navigate({ to: '/dashboard' as never }); }}
                    >
                      <DashboardIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('nav.dashboard')}
                    </MenuItem>
                  )}
                  {isAdmin && (
                    <MenuItem
                      onClick={() => { setUserAnchor(null); void navigate({ to: '/admin' as never }); }}
                    >
                      <AdminIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('nav.admin')}
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('nav.logout')}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Stack direction="row" spacing={1}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Button color="inherit" sx={{ color: 'text.primary' }}>
                    {t('auth.login')}
                  </Button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <Button variant="contained" color="primary">
                    {t('auth.register')}
                  </Button>
                </Link>
              </Stack>
            )}
          </Stack>
        </Toolbar>

        {/* Mobile expandable search bar */}
        {!isDesktop && mobileSearchOpen && (
          <Box
            component="form"
            onSubmit={(e: FormEvent) => {
              handleSearch(e);
              setMobileSearchOpen(false);
            }}
            sx={{ pb: 1.5 }}
          >
            <TextField
              size="small"
              fullWidth
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 999, bgcolor: 'grey.50' },
              }}
            />
          </Box>
        )}
      </Container>
    </AppBar>
  );
}
