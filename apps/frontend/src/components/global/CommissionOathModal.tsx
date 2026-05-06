import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { commissionsApi, type OathType } from '@/api/commissions.api';
import { useAuthStore } from '@/store/auth.store';

interface CommissionOathModalProps {
  open: boolean;
  oathType: OathType;
  /** Optional listing being acted upon — recorded with the oath for traceability. */
  listingId?: string;
  onAccept: () => void;
  onClose: () => void;
}

const ARABIC_OATH = `بسم الله الرحمن الرحيم
أقسم بالله العظيم أنني ملتزم بدفع العمولة المستحقة عند إتمام الصفقة العقارية، وأن ذمتي مرهونة بهذا الالتزام.`;

const ENGLISH_OATH =
  'I hereby commit to paying the agreed commission upon completion of this real estate transaction, and acknowledge this responsibility before God and the law.';

const oathTextFor = (type: OathType) =>
  `${ARABIC_OATH}\n\n${ENGLISH_OATH}\n\nOath type: ${type}`;

const localStorageKeyFor = (type: OathType) => `commission_oath_${type}`;

/**
 * Bilingual commission commitment modal. Required before agents publish a
 * listing and before buyers send an inquiry. The acceptance is persisted to
 * the backend (with IP for legal traceability) and cached in localStorage so
 * the user only has to accept once per device per oath type.
 */
export function CommissionOathModal({
  open,
  oathType,
  listingId,
  onAccept,
  onClose,
}: CommissionOathModalProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [agreed, setAgreed] = useState(false);

  // Reset the checkbox each time the dialog re-opens — accidental re-acceptance
  // should require an explicit second click.
  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  const acceptMutation = useMutation({
    mutationFn: () =>
      commissionsApi.acceptOath({
        oathType,
        oathText: oathTextFor(oathType),
        listingId,
      }),
    onSuccess: () => {
      try {
        localStorage.setItem(localStorageKeyFor(oathType), new Date().toISOString());
      } catch {
        /* localStorage may be disabled in private mode — ignore */
      }
      onAccept();
    },
  });

  const handleAccept = () => {
    // Anonymous users get a localStorage-only acceptance so the inquiry flow
    // can proceed; the inquiry endpoint validates oath presence server-side
    // for authenticated agents.
    if (!isAuthenticated) {
      try {
        localStorage.setItem(localStorageKeyFor(oathType), new Date().toISOString());
      } catch {
        /* ignore */
      }
      onAccept();
      return;
    }
    acceptMutation.mutate();
  };

  const isAr = i18n.language === 'ar';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir={isAr ? 'rtl' : 'ltr'}>
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'common.white',
          textAlign: 'center',
          py: 3,
        }}
      >
        <GavelIcon sx={{ fontSize: 36, mb: 1 }} />
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>
          {isAr ? 'التزام بالأمانة والعمولة' : 'Commission Commitment'}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          // Subtle Islamic-geometric border accent without shipping a real pattern
          // image — a thin gold gradient frame achieves the same gravitas.
          border: '1px solid',
          borderColor: alpha(theme.eawlma.gold, 0.4),
          borderTop: 'none',
          background: `repeating-linear-gradient(45deg, transparent, transparent 24px, ${alpha(
            theme.eawlma.gold,
            0.04,
          )} 24px, ${alpha(theme.eawlma.gold, 0.04)} 25px)`,
          py: 3,
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              borderInlineStart: 4,
              borderColor: theme.eawlma.gold,
              bgcolor: alpha(theme.eawlma.gold, 0.06),
              p: 2.5,
              borderRadius: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Tajawal", "Cairo", system-ui, sans-serif',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'primary.dark',
                lineHeight: 1.9,
                whiteSpace: 'pre-line',
                textAlign: 'center',
              }}
            >
              {ARABIC_OATH}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', lineHeight: 1.7 }}>
            {ENGLISH_OATH}
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: 1,
              borderColor: alpha(theme.palette.primary.main, 0.2),
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
              Commission breakdown
            </Typography>
            {oathType === 'agent_listing' ? (
              <Typography variant="body2" color="text.primary">
                Platform commission: <strong>0.5%</strong> of the transaction value, payable upon successful sale or lease closure.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.primary">
                  Agent commission: <strong>2.5%</strong> of the transaction value.
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Platform fee: <strong>0.5%</strong> of the transaction value.
                </Typography>
              </Stack>
            )}
          </Box>

          {acceptMutation.isError && (
            <Alert severity="error">
              {(acceptMutation.error as Error).message ?? 'Could not record your acceptance'}
            </Alert>
          )}

          <FormControlLabel
            control={<Checkbox checked={agreed} onChange={(_, v) => setAgreed(v)} />}
            label={isAr ? 'أوافق على شروط العمولة' : 'I agree to commission terms'}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="text" color="inherit">
          {isAr ? 'لا أوافق' : 'I do not agree'}
        </Button>
        <Button
          onClick={handleAccept}
          variant="contained"
          disabled={!agreed || acceptMutation.isPending}
          sx={{
            background: theme.eawlma.gradient,
            fontWeight: 700,
            px: 3,
          }}
        >
          {acceptMutation.isPending
            ? isAr
              ? 'جارٍ الحفظ...'
              : 'Saving...'
            : isAr
              ? 'أقبل وأتعهد'
              : 'I Accept & Commit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Helper used by callers to know whether they should bypass the modal. */
export function hasLocallyAcceptedOath(oathType: OathType): boolean {
  try {
    return Boolean(localStorage.getItem(localStorageKeyFor(oathType)));
  } catch {
    return false;
  }
}
