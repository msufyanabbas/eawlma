import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import {
  promosApi,
  type PromoApplicableTo,
  type PromoCode,
  type PromoType,
  type UpsertPromoInput,
} from '@/api/promos.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';

const PROMO_TYPES: PromoType[] = ['percentage', 'fixed_amount', 'free_nights'];
const APPLICABLE: PromoApplicableTo[] = ['all', 'stays', 'long_term', 'specific_listing'];

interface FormState {
  code: string;
  type: PromoType;
  discountValue: string;
  minBookingAmount: string;
  maxDiscountAmount: string;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  isActive: boolean;
  applicableTo: PromoApplicableTo;
  listingId: string;
}

const emptyForm = (): FormState => {
  const today = new Date();
  const oneMonth = new Date();
  oneMonth.setMonth(today.getMonth() + 1);
  return {
    code: '',
    type: 'percentage',
    discountValue: '10',
    minBookingAmount: '0',
    maxDiscountAmount: '',
    validFrom: today.toISOString().slice(0, 10),
    validUntil: oneMonth.toISOString().slice(0, 10),
    maxUses: '',
    isActive: true,
    applicableTo: 'all',
    listingId: '',
  };
};

const toPayload = (form: FormState): UpsertPromoInput => {
  const out: UpsertPromoInput = {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    discountValue: Number(form.discountValue) || 0,
    minBookingAmount: Number(form.minBookingAmount) || 0,
    isActive: form.isActive,
    applicableTo: form.applicableTo,
    validFrom: new Date(form.validFrom).toISOString(),
    validUntil: new Date(form.validUntil).toISOString(),
  };
  if (form.maxDiscountAmount.trim()) {
    out.maxDiscountAmount = Number(form.maxDiscountAmount);
  } else {
    out.maxDiscountAmount = null;
  }
  if (form.maxUses.trim()) {
    out.maxUses = Number(form.maxUses);
  } else {
    out.maxUses = null;
  }
  if (form.applicableTo === 'specific_listing' && form.listingId.trim()) {
    out.listingId = form.listingId.trim();
  } else {
    out.listingId = null;
  }
  return out;
};

const fromPromo = (p: PromoCode): FormState => ({
  code: p.code,
  type: p.type,
  discountValue: String(p.discountValue),
  minBookingAmount: String(p.minBookingAmount),
  maxDiscountAmount: p.maxDiscountAmount ? String(p.maxDiscountAmount) : '',
  validFrom: p.validFrom.slice(0, 10),
  validUntil: p.validUntil.slice(0, 10),
  maxUses: p.maxUses != null ? String(p.maxUses) : '',
  isActive: p.isActive,
  applicableTo: p.applicableTo,
  listingId: p.listingId ?? '',
});

export function AdminPromosPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const listQuery = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: promosApi.listAll,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      return editing
        ? promosApi.update(editing.id, payload)
        : promosApi.create(payload);
    },
    onSuccess: () => {
      setDialogOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promosApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] }),
  });

  const handleNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleEdit = (p: PromoCode) => {
    setEditing(p);
    setForm(fromPromo(p));
    setDialogOpen(true);
  };

  const handleDelete = (p: PromoCode) => {
    if (window.confirm(t('promo.confirmDelete', { defaultValue: 'Delete promo code?' }))) {
      deleteMutation.mutate(p.id);
    }
  };

  const promos = listQuery.data ?? [];

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.promos', { defaultValue: 'Promo codes' })} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('admin.promos', { defaultValue: 'Promo codes' })}
        subtitle={t('admin.promosSubtitle', {
          defaultValue: 'Create and manage discount codes for bookings.',
        })}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
            {t('promo.createNew', { defaultValue: 'Create promo' })}
          </Button>
        }
      />

      <Paper sx={{ p: 2 }}>
        {listQuery.isLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : promos.length === 0 ? (
          <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            {t('promo.empty', { defaultValue: 'No promo codes yet.' })}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('promo.code', { defaultValue: 'Code' })}</TableCell>
                <TableCell>{t('promo.type', { defaultValue: 'Type' })}</TableCell>
                <TableCell>{t('promo.value', { defaultValue: 'Value' })}</TableCell>
                <TableCell>{t('promo.applicableTo', { defaultValue: 'Applies to' })}</TableCell>
                <TableCell>{t('promo.uses', { defaultValue: 'Uses' })}</TableCell>
                <TableCell>{t('promo.validity', { defaultValue: 'Validity' })}</TableCell>
                <TableCell>{t('promo.status', { defaultValue: 'Status' })}</TableCell>
                <TableCell align="right">{t('common.actions', { defaultValue: 'Actions' })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {promos.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.code}</TableCell>
                  <TableCell>{t(`promo.type.${p.type}`, { defaultValue: p.type })}</TableCell>
                  <TableCell>
                    {p.type === 'percentage'
                      ? `${Number(p.discountValue)}%`
                      : p.type === 'free_nights'
                        ? `${Number(p.discountValue)} ${t('promo.nights', { defaultValue: 'nights' })}`
                        : `${Number(p.discountValue).toLocaleString(i18n.language)} SAR`}
                  </TableCell>
                  <TableCell>
                    {t(`promo.applicable.${p.applicableTo}`, { defaultValue: p.applicableTo })}
                  </TableCell>
                  <TableCell>
                    {p.usedCount}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {new Date(p.validFrom).toLocaleDateString(i18n.language)}
                    <br />
                    {new Date(p.validUntil).toLocaleDateString(i18n.language)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.isActive ? t('common.active', { defaultValue: 'Active' }) : t('common.inactive', { defaultValue: 'Inactive' })}
                      color={p.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(p)}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing
            ? t('promo.editTitle', { defaultValue: 'Edit promo code' })
            : t('promo.createNew', { defaultValue: 'Create promo' })}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('promo.code', { defaultValue: 'Code' })}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label={t('promo.type', { defaultValue: 'Type' })}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as PromoType })}
              >
                {PROMO_TYPES.map((t2) => (
                  <MenuItem key={t2} value={t2}>
                    {t(`promo.type.${t2}`, { defaultValue: t2 })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={t('promo.value', { defaultValue: 'Discount value' })}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                helperText={
                  form.type === 'percentage'
                    ? t('promo.helperPercentage', { defaultValue: 'e.g. 10 for 10%' })
                    : form.type === 'free_nights'
                      ? t('promo.helperFreeNights', { defaultValue: 'Number of free nights' })
                      : t('promo.helperFixed', { defaultValue: 'SAR off the booking' })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={t('promo.maxDiscount', { defaultValue: 'Max discount (SAR)' })}
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                disabled={form.type !== 'percentage'}
                helperText={t('promo.maxDiscountHint', {
                  defaultValue: 'Caps the value for percentage promos. Leave blank for no cap.',
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={t('promo.minBooking', { defaultValue: 'Min booking (SAR)' })}
                value={form.minBookingAmount}
                onChange={(e) => setForm({ ...form, minBookingAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={t('promo.maxUses', { defaultValue: 'Max uses (blank = unlimited)' })}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label={t('promo.validFrom', { defaultValue: 'Valid from' })}
                InputLabelProps={{ shrink: true }}
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label={t('promo.validUntil', { defaultValue: 'Valid until' })}
                InputLabelProps={{ shrink: true }}
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label={t('promo.applicableTo', { defaultValue: 'Applies to' })}
                value={form.applicableTo}
                onChange={(e) =>
                  setForm({ ...form, applicableTo: e.target.value as PromoApplicableTo })
                }
              >
                {APPLICABLE.map((a) => (
                  <MenuItem key={a} value={a}>
                    {t(`promo.applicable.${a}`, { defaultValue: a })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {form.applicableTo === 'specific_listing' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('promo.listingId', { defaultValue: 'Listing ID' })}
                  value={form.listingId}
                  onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                }
                label={t('promo.active', { defaultValue: 'Active' })}
              />
            </Grid>
          </Grid>

          {upsertMutation.isError && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error" variant="body2">
                {(upsertMutation.error as Error)?.message ?? 'Error'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            onClick={() => upsertMutation.mutate()}
            disabled={upsertMutation.isPending || !form.code.trim()}
          >
            {editing
              ? t('common.save', { defaultValue: 'Save' })
              : t('common.create', { defaultValue: 'Create' })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Usage rows for the selected promo show inline under the row when
       *  expanded — kept out of scope here to avoid blowing up the dialog. */}
      <Box />

      {/* Render an empty stack just to satisfy the AdminLayout multi-child
       *  layout that expects spacing — `Paper` above already does the work. */}
      <Stack />
    </AdminLayout>
  );
}
