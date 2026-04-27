import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';

export function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearSession, getRefreshToken } = useAuthStore();

  const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);

  const switchLanguage = (lng: 'ar' | 'en') => {
    void i18n.changeLanguage(lng);
    localStorage.setItem('aqarat.locale', lng);
    setLangAnchor(null);
  };

  const handleLogout = async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // network errors are non-fatal at sign-out
      }
    }
    clearSession();
    setUserAnchor(null);
    void navigate({ to: '/' });
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'saturate(180%) blur(8px)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: -0.5 }}
              >
                {t('app.name')}
              </Typography>
            </Link>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Button color="inherit" sx={{ color: 'text.primary' }}>
                  {t('nav.home')}
                </Button>
              </Link>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={(e: MouseEvent<HTMLButtonElement>) => setLangAnchor(e.currentTarget)} aria-label="language">
              <LanguageIcon />
            </IconButton>
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
                <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar
                    src={user.avatarUrl ?? undefined}
                    alt={user.firstName}
                    sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
                  >
                    {user.firstName?.[0]}
                  </Avatar>
                </IconButton>
                <Menu anchorEl={userAnchor} open={!!userAnchor} onClose={() => setUserAnchor(null)}>
                  <MenuItem
                    onClick={() => {
                      setUserAnchor(null);
                      void navigate({ to: '/profile' });
                    }}
                  >
                    <PersonIcon fontSize="small" sx={{ mr: 1 }} /> {t('nav.profile')}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> {t('nav.logout')}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
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
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
