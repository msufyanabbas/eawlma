import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyType } from '@eawlma/shared-types';
import {
  propertyRequestsApi,
  type CreatePropertyRequestPayload,
} from '@/api/propertyRequests.api';
import { extractErrorMessage } from '@/api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-filled defaults (e.g. from active search filters). */
  initialCity?: string;
  initialPropertyType?: string;
}

const PROPERTY_TYPE_OPTIONS: PropertyType[] = [
  PropertyType.APARTMENT,
  PropertyType.VILLA,
  PropertyType.OFFICE,
  PropertyType.LAND,
  PropertyType.COMMERCIAL,
  PropertyType.STUDIO,
  PropertyType.PENTHOUSE,
  PropertyType.TOWNHOUSE,
];

export function PropertyRequestDialog({
  open,
  onClose,
  initialCity,
  initialPropertyType,
}: Props) {
  const { t } = useTranslation();
  const [propertyType, setPropertyType] = useState<string>(
    initialPropertyType ?? PROPERTY_TYPE_OPTIONS[0],
  );
  const [city, setCity] = useState(initialCity ?? '');
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: CreatePropertyRequestPayload = {
        propertyType,
        city: city.trim(),
        contactPhone: contactPhone.trim(),
      };
      if (minBudget) payload.minBudget = Number(minBudget);
      if (maxBudget) payload.maxBudget = Number(maxBudget);
      if (bedrooms) payload.bedrooms = Number(bedrooms);
      if (message) payload.message = message;
      if (contactEmail) payload.contactEmail = contactEmail;
      await propertyRequestsApi.create(payload);
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSuccess(false);
      setError(null);
    }, 300);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ fontWeight: 800 }}>{t('propertyRequest.title')}</Box>
          <Box sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
            {t('propertyRequest.subtitle')}
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ my: 2 }}>
            <Box sx={{ fontWeight: 700 }}>{t('propertyRequest.success')}</Box>
            <Box>{t('propertyRequest.successBody')}</Box>
          </Alert>
        ) : (
          <Stack component="form" id="property-request-form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label={t('propertyRequest.propertyType')}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                fullWidth
                required
              >
                {PROPERTY_TYPE_OPTIONS.map((pt) => (
                  <MenuItem key={pt} value={pt}>
                    {t(`propertyTypes.${pt.toLowerCase()}`, { defaultValue: pt })}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('propertyRequest.city')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                fullWidth
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('propertyRequest.minBudget')}
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('propertyRequest.maxBudget')}
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('propertyRequest.bedrooms')}
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label={t('propertyRequest.contactPhone')}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('propertyRequest.message')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={handleClose}>{t('common.close')}</Button>
        {!success && (
          <Button
            type="submit"
            form="property-request-form"
            variant="contained"
            disabled={submitting || !city || !contactPhone}
          >
            {t('propertyRequest.submit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
