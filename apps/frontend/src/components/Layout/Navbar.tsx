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
  const [staysAnchor, setStaysAnchor] = useState<HTMLElement | null>(null);
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

  const switchLanguage = (lng: 'ar' | 'en' | 'ur') => {
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
        bgcolor: scrolled
          ? theme.palette.mode === 'dark'
            ? 'rgba(15, 14, 30, 0.92)'
            : 'rgba(255, 255, 255, 0.92)'
          : 'background.paper',
        color: theme.palette.mode === 'dark' && scrolled ? 'rgba(255,255,255,0.95)' : 'text.primary',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: 1,
        borderColor: scrolled ? 'rgba(108,99,166,0.18)' : 'divider',
        boxShadow: scrolled ? '0 2px 20px rgba(108,99,166,0.08)' : 'none',
        transition: 'background-color 220ms ease, border-color 220ms ease, backdrop-filter 220ms ease, box-shadow 220ms ease',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 3, md: 6, lg: 8 } }}>
        <Toolbar
          disableGutters
          sx={{
            gap: 2,
            py: 1,
            minHeight: { xs: 64, md: 72 },
            justifyContent: 'space-between',
          }}
        >
          {/* Mobile hamburger */}
          {!isDesktop && (
            <IconButton edge="start" onClick={onMobileMenuClick} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}

          {/* Brand — pinned to inline-start */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                component="img"
                src={logoUrl}
                alt={t('app.name')}
                sx={{ height: 44, width: 44, display: 'block', mr: 0.25 }}
              />
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'primary.main',
                  letterSpacing: '-0.5px',
                  display: { xs: 'none', sm: 'block' },
                  lineHeight: 1,
                }}
              >
                {t('app.name')}
              </Typography>
            </Stack>
          </Link>

          {/* Search bar — centered pill, 560px max; icon-only on mobile */}
          {isDesktop ? (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                mx: 4,
              }}
            >
              <TextField
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 999,
                    bgcolor: 'grey.50',
                    pl: 2,
                    pr: 1.5,
                    height: 44,
                    border: '1px solid',
                    borderColor: 'divider',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: 'primary.light' },
                    '&.Mui-focused': { borderColor: 'primary.main', bgcolor: 'common.white' },
                  },
                }}
                sx={{ width: '100%', maxWidth: 560 }}
              />
            </Box>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}

          {/* Right cluster — pinned to inline-end */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {isDesktop && (
              <>
                <Button
                  color="inherit"
                  onClick={(e) => setStaysAnchor(e.currentTarget)}
                  sx={{ color: 'text.primary', fontWeight: 600, textTransform: 'none' }}
                >
                  {t('nav.stays', { defaultValue: 'Stays' })}
                </Button>
                <Menu
                  anchorEl={staysAnchor}
                  open={!!staysAnchor}
                  onClose={() => setStaysAnchor(null)}
                  PaperProps={{ sx: { minWidth: 200, mt: 1, borderRadius: 2 } }}
                >
                  <MenuItem
                    onClick={() => { setStaysAnchor(null); void navigate({ to: '/stays' as never }); }}
                  >
                    {t('nav.shortTermStays', { defaultValue: 'Short-term stays' })}
                  </MenuItem>
                  <MenuItem
                    onClick={() => { setStaysAnchor(null); void navigate({ to: '/hotels' as never }); }}
                  >
                    {t('nav.hotels', { defaultValue: 'Hotels' })}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setStaysAnchor(null);
                      void navigate({ to: '/search' as never, search: { rentalType: 'chalet' } as never });
                    }}
                  >
                    {t('nav.chalets', { defaultValue: 'Chalets & farms' })}
                  </MenuItem>
                </Menu>

                <Link to="/market" style={{ textDecoration: 'none' }}>
                  <Button
                    color="inherit"
                    sx={{ color: 'text.primary', fontWeight: 600, textTransform: 'none' }}
                  >
                    {t('nav.market')}
                  </Button>
                </Link>
              </>
            )}
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
              <MenuItem selected={i18n.language === 'en'} onClick={() => switchLanguage('en')}>
                🇬🇧 English
              </MenuItem>
              <MenuItem selected={i18n.language === 'ar'} onClick={() => switchLanguage('ar')}>
                🇸🇦 العربية
              </MenuItem>
              <MenuItem selected={i18n.language === 'ur'} onClick={() => switchLanguage('ur')}>
                🇵🇰 اردو
              </MenuItem>
            </Menu>

            {isAuthenticated && user ? (
              <>
                <Tooltip title={t('nav.messages')}>
                  <IconButton
                    onClick={() => navigate({ to: '/dashboard/messages' as never })}
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
                <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                  <Button color="inherit" sx={{ color: 'text.primary' }}>
                    {t('auth.login')}
                  </Button>
                </Link>
                <Link to="/auth/register" style={{ textDecoration: 'none' }}>
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
