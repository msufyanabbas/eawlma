import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutline';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { UserRole } from '@eawlma/shared-types';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore, type UiLanguage } from '@/store/ui.store';
import { authApi } from '@/api/auth.api';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { LanguageSwitcherModal } from './LanguageSwitcherModal';

interface NavbarProps {
  onMobileMenuClick?: () => void;
}

const NAVBAR_MAX = 1400;
const NAVBAR_HEIGHT = 64;

const AGENT_ROLES = new Set<UserRole>([UserRole.AGENT, UserRole.AGENCY_ADMIN]);
const ADMIN_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.MODERATOR]);

export function Navbar({ onMobileMenuClick }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isAr = i18n.language === 'ar';

  const { user, isAuthenticated, clearSession, getRefreshToken } = useAuthStore();
  const setLanguage = useUiStore((s) => s.setLanguage);
  const themeMode = useUiStore((s) => s.themeMode);
  const toggleThemeMode = useUiStore((s) => s.toggleThemeMode);
  const unreadMessageCount = useUiStore((s) => s.unreadMessageCount);

  const [langModalOpen, setLangModalOpen] = useState(false);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Notification badge count — only fetched when authenticated.
  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const unreadNotifications = notificationsQuery.data ?? 0;

  useEffect(() => {
    // No-op; placeholder kept in case future scroll-state tweaks return.
  }, []);

  const switchLanguage = (lng: UiLanguage) => {
    void i18n.changeLanguage(lng);
    // The store handles persisting to localStorage + the backend (when a
    // user id is available) so a returning user sees the same language on
    // any other device they sign into.
    setLanguage(lng, user?.id ?? null);
  };

  const handleLogout = async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // best-effort sign-out
      }
    }
    clearSession();
    setUserAnchor(null);
    void navigate({ to: '/' });
  };

  const handleSearch = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    void navigate({ to: '/search', search: { q } as never });
  };

  const isAgent = user ? AGENT_ROLES.has(user.role as UserRole) : false;
  const isAdmin = user ? ADMIN_ROLES.has(user.role as UserRole) : false;
  const isDark = themeMode === 'dark';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: theme.zIndex.appBar,
      }}
    >
      {/* ============================== MAIN TOOLBAR ============================== */}
      <Box
        sx={{
          width: '100%',
          maxWidth: NAVBAR_MAX,
          mx: 'auto',
          px: { xs: 2, md: 4, lg: 5 },
          height: NAVBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Mobile hamburger */}
        {!isDesktop && (
          <IconButton edge="start" onClick={onMobileMenuClick} aria-label="menu" size="small">
            <MenuIcon />
          </IconButton>
        )}

        {/* LOGO */}
        <Box
          component="a"
          href="/"
          sx={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HomeIcon sx={{ color: 'common.white', fontSize: 20 }} />
          </Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.3rem',
              color: 'primary.main',
              fontFamily: 'Tajawal, sans-serif',
              letterSpacing: '-0.02em',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {t('app.name')}
          </Typography>
        </Box>

        {/* SEARCH — grows in the middle */}
        {isDesktop ? (
          <Box component="form" onSubmit={handleSearch} sx={{ flex: 1, maxWidth: 560, mx: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  height: 40,
                  '& fieldset': { borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                },
              }}
            />
          </Box>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

        {/* RIGHT ACTIONS */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, md: 1 },
            ml: 'auto',
            flexShrink: 0,
          }}
        >
          {!isDesktop && (
            <Tooltip title={t('common.search')}>
              <IconButton
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label="search"
                size="small"
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={t('common.language')}>
            <IconButton
              size="small"
              onClick={() => setLangModalOpen(true)}
              aria-label="language"
              sx={{ color: 'text.secondary' }}
            >
              <LanguageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <LanguageSwitcherModal
            open={langModalOpen}
            onClose={() => setLangModalOpen(false)}
            onLanguageChange={switchLanguage}
          />

          <Tooltip title={t(isDark ? 'common.lightMode' : 'common.darkMode')}>
            <IconButton
              size="small"
              onClick={() => toggleThemeMode(user?.id ?? null)}
              aria-label="toggle theme"
              sx={{ color: 'text.secondary' }}
            >
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {isAuthenticated && user ? (
            <>
              <Tooltip title={t('nav.notifications')}>
                <IconButton
                  size="small"
                  onClick={() => navigate({ to: '/dashboard/notifications' as never })}
                  aria-label="notifications"
                  sx={{ color: 'text.secondary' }}
                >
                  <Badge badgeContent={unreadNotifications} color="error" max={99}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={t('nav.messages')}>
                <IconButton
                  size="small"
                  onClick={() => navigate({ to: '/dashboard/messages' as never })}
                  aria-label="messages"
                  sx={{ color: 'text.secondary' }}
                >
                  <Badge badgeContent={unreadMessageCount} color="error">
                    <ChatBubbleIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              {isAgent && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => navigate({ to: '/dashboard/listings/new' as never })}
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'secondary.dark' },
                    fontWeight: 700,
                    px: 2,
                    height: 36,
                    display: { xs: 'none', sm: 'flex' },
                    boxShadow: 'none',
                  }}
                >
                  {t('home.addListing')}
                </Button>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<DashboardIcon />}
                onClick={() =>
                  navigate({ to: (isAdmin ? '/admin' : '/dashboard') as never })
                }
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: 600,
                  px: 1.5,
                  height: 36,
                  display: { xs: 'none', md: 'flex' },
                }}
              >
                {isAdmin ? t('nav.admin') : t('nav.dashboard')}
              </Button>

              <Tooltip title={`${user.firstName} ${user.lastName}`}>
                <Avatar
                  src={user.avatarUrl ?? undefined}
                  onClick={(e: MouseEvent<HTMLElement>) => setUserAnchor(e.currentTarget)}
                  sx={{
                    width: 36,
                    height: 36,
                    cursor: 'pointer',
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    border: '2px solid',
                    borderColor: 'primary.light',
                    '&:hover': { borderColor: 'secondary.main' },
                  }}
                >
                  {user.firstName?.[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>

              <Menu
                anchorEl={userAnchor}
                open={!!userAnchor}
                onClose={() => setUserAnchor(null)}
                PaperProps={{ sx: { minWidth: 220, mt: 1, borderRadius: 2 } }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography fontWeight={700}>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>

                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    void navigate({ to: '/profile' });
                  }}
                >
                  <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {t('nav.profile')}
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    void navigate({ to: (isAdmin ? '/admin' : '/dashboard') as never });
                  }}
                >
                  <DashboardIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {isAdmin ? t('nav.admin') : t('nav.dashboard')}
                </MenuItem>

                {isAgent && (
                  <MenuItem
                    onClick={() => {
                      setUserAnchor(null);
                      void navigate({ to: '/dashboard/listings/new' as never });
                    }}
                  >
                    <AddIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('home.addListing')}
                  </MenuItem>
                )}

                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    void navigate({ to: '/dashboard/wallet' as never });
                  }}
                >
                  <AccountBalanceWalletIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {t('wallet.title')}
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    void navigate({ to: '/dashboard/settings' as never });
                  }}
                >
                  <SettingsIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {t('nav.settings')}
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                  {t('nav.logout')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate({ to: '/auth/login' as never })}
                sx={{ color: 'text.primary', fontWeight: 600 }}
              >
                {t('auth.signIn')}
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate({ to: '/auth/register' as never })}
                sx={{
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  fontWeight: 700,
                  px: 2,
                  boxShadow: 'none',
                }}
              >
                {t('auth.signUp')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* ============================== SECOND ROW: CATEGORY LINKS ============================== */}
      {isDesktop && <CategoryNavRow currentPath={location.pathname} isAr={isAr} />}

      {/* Mobile expandable search */}
      {!isDesktop && mobileSearchOpen && (
        <Box
          component="form"
          onSubmit={(e: FormEvent) => {
            handleSearch(e);
            setMobileSearchOpen(false);
          }}
          sx={{ px: 2, pb: 1.5 }}
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
              sx: { borderRadius: 2, bgcolor: 'grey.50' },
            }}
          />
        </Box>
      )}
    </AppBar>
  );
}

// ------------------------------------------------------------------
// Category nav row — secondary horizontal strip under the main toolbar.
// ------------------------------------------------------------------

const CATEGORY_LINKS: Array<{ labelEn: string; labelAr: string; to: string }> = [
  { labelEn: 'Home',   labelAr: 'الرئيسية',   to: '/' },
  { labelEn: 'Search', labelAr: 'بحث',         to: '/search' },
  { labelEn: 'Stays',  labelAr: 'إيجار قصير', to: '/stays' },
  { labelEn: 'Hotels', labelAr: 'فنادق',       to: '/hotels' },
  { labelEn: 'Agents', labelAr: 'الوكلاء',     to: '/agents' },
  { labelEn: 'Market', labelAr: 'السوق',       to: '/market' },
  { labelEn: 'About',  labelAr: 'عن المنصة',  to: '/about' },
];

function CategoryNavRow({ currentPath, isAr }: { currentPath: string; isAr: boolean }) {
  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        className="scrollbar-hide"
        sx={{
          maxWidth: NAVBAR_MAX,
          mx: 'auto',
          px: { md: 4, lg: 5 },
          display: 'flex',
          overflowX: 'auto',
        }}
      >
        {CATEGORY_LINKS.map((link) => {
          const isActive =
            currentPath === link.to || (link.to !== '/' && currentPath.startsWith(link.to));
          return (
            <Box
              key={link.to}
              component="a"
              href={link.to}
              sx={{
                px: 2.5,
                py: 1.25,
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'primary.main' : 'text.secondary',
                borderBottom: '2.5px solid',
                borderBottomColor: isActive ? 'primary.main' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s',
                '&:hover': {
                  color: 'primary.main',
                  borderBottomColor: 'primary.light',
                },
              }}
            >
              {isAr ? link.labelAr : link.labelEn}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
