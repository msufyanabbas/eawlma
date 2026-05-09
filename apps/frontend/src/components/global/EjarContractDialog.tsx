import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ejarApi, type RentalContract } from '@/api/ejar.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  open: boolean;
  onClose: () => void;
  listingId: string;
  defaultMonthlyRent?: number;
}

export function EjarContractDialog({
  open,
  onClose,
  listingId,
  defaultMonthlyRent,
}: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [tenantNationalId, setTenantNationalId] = useState('');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [monthlyRent, setMonthlyRent] = useState(
    defaultMonthlyRent ? String(defaultMonthlyRent) : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RentalContract | null>(null);

  const annualRent = useMemo(() => {
    const m = Number(monthlyRent);
    return Number.isFinite(m) ? m * 12 : 0;
  }, [monthlyRent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const contract = await ejarApi.create({
        listingId,
        tenantUserId: user.id,
        tenantNationalId: tenantNationalId.trim(),
        startDate,
        endDate,
        monthlyRent: Number(monthlyRent),
        annualRent,
      });
      setCreated(contract);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => {
      setCreated(null);
      setError(null);
    }, 300);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 800 }}>{t('ejar.createContract')}</Typography>
        <IconButton size="small" onClick={close} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {created ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              <Typography sx={{ fontWeight: 700 }}>{t('ejar.contractCreated')}</Typography>
              {created.ejarContractNumber && (
                <Typography variant="body2">
                  {t('ejar.contractNumber')}: <b>{created.ejarContractNumber}</b>
                </Typography>
              )}
            </Alert>
            {created.ejarUrl && (
              <Button
                variant="contained"
                color="success"
                endIcon={<OpenInNewIcon />}
                href={created.ejarUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('ejar.viewContract')}
              </Button>
            )}
          </Stack>
        ) : (
          <Stack component="form" id="ejar-form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              required
              label={t('ejar.tenantNationalId')}
              value={tenantNationalId}
              onChange={(e) => setTenantNationalId(e.target.value)}
              placeholder="1xxxxxxxxx"
              inputProps={{ inputMode: 'numeric' }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label={t('ejar.startDate')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                required
                label={t('ejar.endDate')}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label={t('ejar.monthlyRent')}
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('ejar.annualRent')}
                value={annualRent}
                disabled
                fullWidth
              />
            </Stack>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(0, 150, 57, 0.08)',
                border: '1px solid rgba(0, 150, 57, 0.3)',
                borderRadius: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t('ejar.signedThroughEjar')}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={close}>{t('common.close')}</Button>
        {!created && (
          <Button
            type="submit"
            form="ejar-form"
            variant="contained"
            color="success"
            disabled={submitting || !tenantNationalId || !monthlyRent}
          >
            {t('ejar.submit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
