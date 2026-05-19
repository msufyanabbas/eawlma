import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import KeyIcon from '@mui/icons-material/VpnKeyOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ListingType } from '@eawlma/shared-types';

const STORAGE_KEY = 'eawlma.welcome.seen';

export function WelcomeModal() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intent, setIntent] = useState<ListingType | null>(null);
  const [city, setCity] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const id = window.setTimeout(() => setOpen(true), 800);
      return () => window.clearTimeout(id);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const handleStartSearch = (e?: FormEvent) => {
    e?.preventDefault();
    close();
    const search: Record<string, string> = {};
    if (intent) search.type = intent;
    if (city.trim()) search.city = city.trim();
    void navigate({ to: '/search', search: search as never });
  };

  const goAgentSignup = () => {
    close();
    void navigate({ to: '/auth/register' });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <Box
        sx={{
          background: theme.eawlma.gradient,
          color: 'common.white',
          p: 3,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={close}
          sx={{ position: 'absolute', insetInlineEnd: 8, top: 8, color: 'common.white' }}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, letterSpacing: 1.2 }}>
          {step}/3
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
          {step === 1 && t('welcome.step1Title')}
          {step === 2 && t('welcome.step2Title')}
          {step === 3 && t('welcome.step3Title')}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {step === 1 && t('welcome.step1Subtitle')}
          {step === 2 && t('welcome.step2Subtitle')}
          {step === 3 && t('welcome.step3Subtitle')}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        {step === 1 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              fullWidth
              size="large"
              variant={intent === ListingType.SALE ? 'contained' : 'outlined'}
              onClick={() => setIntent(ListingType.SALE)}
              startIcon={<HomeIcon />}
              sx={{ py: 3, fontSize: '1.1rem', fontWeight: 700 }}
            >
              {t('welcome.buy')}
            </Button>
            <Button
              fullWidth
              size="large"
              variant={intent === ListingType.RENT ? 'contained' : 'outlined'}
              onClick={() => setIntent(ListingType.RENT)}
              startIcon={<KeyIcon />}
              sx={{ py: 3, fontSize: '1.1rem', fontWeight: 700 }}
            >
              {t('welcome.rent')}
            </Button>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<BadgeIcon />}
              onClick={goAgentSignup}
              sx={{ py: 2.5, fontSize: '1rem', fontWeight: 700 }}
            >
              {t('welcome.yesAgent')}
            </Button>
            <Button
              fullWidth
              size="large"
              variant="outlined"
              onClick={() => setStep(3)}
              sx={{ py: 2.5, fontSize: '1rem' }}
            >
              {t('welcome.notAgent')}
            </Button>
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={2} component="form" onSubmit={handleStartSearch}>
            <TextField
              autoFocus
              fullWidth
              label={t('search.city')}
              placeholder={t('welcomeModal.cityPlaceholder')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
        <Button onClick={close} color="inherit" sx={{ color: 'text.secondary' }}>
          {t('welcome.skip')}
        </Button>
        <Stack direction="row" spacing={1}>
          {step > 1 && (
            <Button onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>{t('welcome.back')}</Button>
          )}
          {step === 1 && (
            <Button
              variant="contained"
              disabled={!intent}
              onClick={() => setStep(2)}
              sx={{ background: theme.eawlma.gradient }}
            >
              {t('welcome.next')}
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="contained"
              onClick={() => handleStartSearch()}
              sx={{ background: theme.eawlma.gradient }}
            >
              {t('welcome.startSearching')}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
