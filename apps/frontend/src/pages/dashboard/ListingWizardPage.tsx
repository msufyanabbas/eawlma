import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import {
  ListingFurnishing,
  ListingType,
  Locale,
  MediaType,
  PropertyType,
  RentPeriod,
  SHORT_TERM_PROPERTY_TYPES,
  HOTEL_PROPERTY_TYPES,
  type CancellationPolicy,
  type ShortTermAmenities,
} from '@eawlma/shared-types';

import { listingsApi } from '@/api/listings.api';
import { CommissionOathModal, hasLocallyAcceptedOath } from '@/components/global/CommissionOathModal';
import { storageApi } from '@/api/storage.api';
import { aiApi, type PriceSuggestion } from '@/api/ai.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';

// ------------------------------------------------------------------
// Form state
// ------------------------------------------------------------------

interface MediaItem {
  id?: string;          // server id once persisted
  type: MediaType;
  url: string;          // public URL after upload
  objectKey?: string;
  caption?: string;
  position: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

interface WizardState {
  type: ListingType;
  propertyType: PropertyType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: string;
  rentPeriod: RentPeriod | '';
  area: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  furnishing: ListingFurnishing | '';
  yearBuilt: string;

  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  lat: number;
  lng: number;

  media: MediaItem[];
  vrUrl: string;
  modelUrl: string;
  modelObjectKey?: string;

  amenityKeys: string[];

  permitNumber: string;
  regaNumber: string;
  permitExpiry: string;
  contactPreference: 'phone' | 'whatsapp' | 'email';
  visibility: 'public' | 'unlisted';

  // ---- Short-term / hospitality (only relevant when propertyType is one
  //      of SHORT_TERM_PROPERTY_TYPES) ----
  dailyRate: string;
  weeklyRate: string;
  minimumStay: string;
  maxGuests: string;
  amenitiesDetailed: ShortTermAmenities;
  houseRules: string;
  checkInTime: string;
  checkOutTime: string;
  instantBook: boolean;
  cancellationPolicy: CancellationPolicy | '';
  hotelStarRating: string;
  hotelName: string;
}

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

const AMENITY_OPTIONS = [
  { key: 'pool', label: 'Pool' },
  { key: 'garden', label: 'Garden' },
  { key: 'gym', label: 'Gym' },
  { key: 'elevator', label: 'Elevator' },
  { key: 'maid_room', label: 'Maid room' },
  { key: 'driver_room', label: 'Driver room' },
  { key: 'central_ac', label: 'Central AC' },
  { key: 'kitchen_appliances', label: 'Kitchen appliances' },
  { key: 'security', label: '24/7 security' },
  { key: 'corner_unit', label: 'Corner unit' },
];

const STEP_KEYS: Array<'basicInfo' | 'location' | 'media' | 'amenities' | 'compliance' | 'review'> = [
  'basicInfo',
  'location',
  'media',
  'amenities',
  'compliance',
  'review',
];

const initialState: WizardState = {
  type: ListingType.SALE,
  propertyType: PropertyType.APARTMENT,
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  price: '',
  rentPeriod: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  parkingSpaces: '',
  furnishing: '',
  yearBuilt: '',

  city: '',
  district: '',
  street: '',
  buildingNumber: '',
  postalCode: '',
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,

  media: [],
  vrUrl: '',
  modelUrl: '',
  amenityKeys: [],

  permitNumber: '',
  regaNumber: '',
  permitExpiry: '',
  contactPreference: 'whatsapp',
  visibility: 'public',

  dailyRate: '',
  weeklyRate: '',
  minimumStay: '1',
  maxGuests: '',
  amenitiesDetailed: {},
  houseRules: '',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  instantBook: false,
  cancellationPolicy: '',
  hotelStarRating: '',
  hotelName: '',
};

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function ListingWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { id?: string };
  const editingId = params.id;
  const isEdit = Boolean(editingId);

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [savedListingId, setSavedListingId] = useState<string | undefined>(editingId);
  const [oathOpen, setOathOpen] = useState(false);

  // Hydrate when editing
  const editQuery = useQuery({
    queryKey: ['listings', editingId],
    queryFn: () => listingsApi.getById(editingId!),
    enabled: isEdit,
  });
  useEffect(() => {
    if (editQuery.data) {
      const l = editQuery.data;
      setState((s) => ({
        ...s,
        type: l.type,
        propertyType: l.propertyType,
        titleAr: l.sourceLocale === 'ar' ? l.title : l.translations.find((t) => t.locale === 'ar')?.title ?? '',
        titleEn: l.sourceLocale === 'en' ? l.title : l.translations.find((t) => t.locale === 'en')?.title ?? '',
        descriptionAr: l.sourceLocale === 'ar' ? l.description : l.translations.find((t) => t.locale === 'ar')?.description ?? '',
        descriptionEn: l.sourceLocale === 'en' ? l.description : l.translations.find((t) => t.locale === 'en')?.description ?? '',
        price: String(l.price),
        rentPeriod: l.rentPeriod ?? '',
        area: l.area !== null ? String(l.area) : '',
        bedrooms: l.bedrooms !== null ? String(l.bedrooms) : '',
        bathrooms: l.bathrooms !== null ? String(l.bathrooms) : '',
        parkingSpaces: l.parkingSpaces !== null ? String(l.parkingSpaces) : '',
        furnishing: l.furnishing ?? '',
        yearBuilt: l.yearBuilt !== null ? String(l.yearBuilt) : '',
        city: l.city,
        district: l.district ?? '',
        lat: Number(l.lat),
        lng: Number(l.lng),
        media: l.media.map((m, i) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          caption: m.caption ?? undefined,
          position: m.position ?? i,
        })),
        vrUrl: l.media.find((m) => m.type === MediaType.TOUR_360)?.url ?? '',
        modelUrl: '',
        dailyRate: l.dailyRate !== null && l.dailyRate !== undefined ? String(l.dailyRate) : '',
        weeklyRate: l.weeklyRate !== null && l.weeklyRate !== undefined ? String(l.weeklyRate) : '',
        minimumStay: l.minimumStay ? String(l.minimumStay) : '1',
        maxGuests: l.maxGuests ? String(l.maxGuests) : '',
        amenitiesDetailed: l.amenitiesDetailed ?? {},
        houseRules: l.houseRules ?? '',
        checkInTime: l.checkInTime ?? '15:00',
        checkOutTime: l.checkOutTime ?? '11:00',
        instantBook: !!l.instantBook,
        cancellationPolicy: l.cancellationPolicy ?? '',
        hotelStarRating: l.hotelStarRating ? String(l.hotelStarRating) : '',
        hotelName: l.hotelName ?? '',
      }));
      setSavedListingId(l.id);
    }
  }, [editQuery.data]);

  const update = (
    patch: Partial<WizardState> | ((prev: WizardState) => Partial<WizardState>),
  ) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  // Determine source locale + payload locale-aware values
  const sourceLocale: Locale = state.titleAr ? Locale.AR : Locale.EN;
  const sourceTitle = sourceLocale === Locale.AR ? state.titleAr : state.titleEn;
  const sourceDescription = sourceLocale === Locale.AR ? state.descriptionAr : state.descriptionEn;

  const buildPayload = () => ({
    type: state.type,
    propertyType: state.propertyType,
    title: sourceTitle.trim(),
    description: sourceDescription.trim(),
    locale: sourceLocale,
    price: Number(state.price),
    currency: 'SAR' as const,
    rentPeriod: state.type === ListingType.RENT ? (state.rentPeriod || RentPeriod.MONTHLY) : undefined,
    features: {
      bedrooms: state.bedrooms ? Number(state.bedrooms) : undefined,
      bathrooms: state.bathrooms ? Number(state.bathrooms) : undefined,
      area: state.area ? Number(state.area) : undefined,
      parkingSpaces: state.parkingSpaces ? Number(state.parkingSpaces) : undefined,
      yearBuilt: state.yearBuilt ? Number(state.yearBuilt) : undefined,
      furnishing: state.furnishing || undefined,
      hasPool: state.amenityKeys.includes('pool'),
      hasGarden: state.amenityKeys.includes('garden'),
      hasGym: state.amenityKeys.includes('gym'),
      hasElevator: state.amenityKeys.includes('elevator'),
      hasMaidRoom: state.amenityKeys.includes('maid_room'),
      hasDriverRoom: state.amenityKeys.includes('driver_room'),
      hasCentralAC: state.amenityKeys.includes('central_ac'),
      hasKitchenAppliances: state.amenityKeys.includes('kitchen_appliances'),
      hasSecurity: state.amenityKeys.includes('security'),
      isCornerUnit: state.amenityKeys.includes('corner_unit'),
    },
    address: {
      country: 'SA',
      region: state.city,
      city: state.city,
      district: state.district || undefined,
      street: state.street || undefined,
      buildingNumber: state.buildingNumber || undefined,
      postalCode: state.postalCode || undefined,
    },
    location: { lat: state.lat, lng: state.lng },
    shortTerm: SHORT_TERM_PROPERTY_TYPES.includes(state.propertyType)
      ? {
          maxGuests: state.maxGuests ? Number(state.maxGuests) : undefined,
          amenitiesDetailed: state.amenitiesDetailed,
          houseRules: state.houseRules || undefined,
          checkInTime: state.checkInTime || undefined,
          checkOutTime: state.checkOutTime || undefined,
          instantBook: state.instantBook,
          cancellationPolicy: state.cancellationPolicy || undefined,
          hotelStarRating: HOTEL_PROPERTY_TYPES.includes(state.propertyType) && state.hotelStarRating
            ? Number(state.hotelStarRating)
            : undefined,
          hotelName: HOTEL_PROPERTY_TYPES.includes(state.propertyType)
            ? state.hotelName || undefined
            : undefined,
          dailyRate: state.dailyRate ? Number(state.dailyRate) : undefined,
          weeklyRate: state.weeklyRate ? Number(state.weeklyRate) : undefined,
          minimumStay: state.minimumStay ? Number(state.minimumStay) : undefined,
          bookingType: 'short_term' as const,
        }
      : undefined,
  });

  // ---- Save / Submit -----------------------------------------------
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (savedListingId) return listingsApi.update(savedListingId, payload);
      const created = await listingsApi.create(payload);
      setSavedListingId(created.id);
      // Sync any media that was uploaded before the listing existed
      for (const m of state.media.filter((x) => !x.id)) {
        const persisted = await listingsApi.addMedia(created.id, {
          type: m.type,
          url: m.url,
          caption: m.caption,
          position: m.position,
        });
        m.id = persisted.id;
      }
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listings', 'mine'] }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let id = savedListingId;
      if (!id) {
        const created = await listingsApi.create(buildPayload());
        id = created.id;
        setSavedListingId(id);
        for (const m of state.media.filter((x) => !x.id)) {
          await listingsApi.addMedia(id, { type: m.type, url: m.url, caption: m.caption, position: m.position });
        }
      } else {
        await listingsApi.update(id, buildPayload());
      }
      return listingsApi.submit(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listings', 'mine'] });
      void navigate({ to: '/dashboard/listings' });
    },
  });

  // ---- Step nav ----------------------------------------------------
  const next = () => {
    setError(null);
    const validation = validateStep(step, state);
    if (validation) {
      setError(validation);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // ---- Render ------------------------------------------------------
  return (
    <DashboardLayout>
      <Helmet>
        <title>{isEdit ? 'Edit listing' : 'New listing'} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={isEdit ? 'Edit listing' : 'New listing'}
        breadcrumbs={[
          { label: t('dashboard.overview'), to: '/dashboard' },
          { label: t('dashboard.listings'), to: '/dashboard/listings' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEP_KEYS.map((key) => (
            <Step key={key}><StepLabel>{t(`wizard.${key}`)}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Loading hydration state for /edit */}
        {isEdit && editQuery.isLoading && (
          <Stack spacing={2}><Skeleton variant="rectangular" height={48} /><Skeleton variant="rectangular" height={48} /><Skeleton variant="rectangular" height={120} /></Stack>
        )}

        {(!isEdit || !editQuery.isLoading) && (
          <>
            {step === 0 && <BasicInfoStep state={state} update={update} />}
            {step === 1 && <LocationStep state={state} update={update} />}
            {step === 2 && <MediaStep state={state} update={update} listingId={savedListingId} />}
            {step === 3 && <AmenitiesStep state={state} update={update} />}
            {step === 4 && <ComplianceStep state={state} update={update} />}
            {step === 5 && <ReviewStep state={state} update={update} />}
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Button onClick={prev} disabled={step === 0}>{t('common.previous')}</Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending}
            >
              {saveDraftMutation.isPending ? t('common.loading') : t('wizard.saveDraft')}
            </Button>
            {step < STEP_KEYS.length - 1 ? (
              <Button variant="contained" color="primary" onClick={next}>
                {t('common.next')}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  // Agents must commit to the platform commission before
                  // pushing a listing live. The modal records the oath, then
                  // we re-trigger submission.
                  if (!hasLocallyAcceptedOath('agent_listing')) {
                    setOathOpen(true);
                    return;
                  }
                  submitMutation.mutate();
                }}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? t('common.loading') : t('wizard.submit')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <CommissionOathModal
        open={oathOpen}
        oathType="agent_listing"
        listingId={savedListingId}
        onClose={() => setOathOpen(false)}
        onAccept={() => {
          setOathOpen(false);
          submitMutation.mutate();
        }}
      />
    </DashboardLayout>
  );
}

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------

function validateStep(step: number, s: WizardState): string | null {
  if (step === 0) {
    if (!s.titleAr && !s.titleEn) return 'Please add a title in at least one language.';
    if (!s.descriptionAr && !s.descriptionEn) return 'Please add a description in at least one language.';
    if (!s.price || Number(s.price) <= 0) return 'Price must be greater than zero.';
  }
  if (step === 1) {
    if (!s.city.trim()) return 'City is required.';
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return 'Drop a pin on the map for the location.';
  }
  if (step === 2) {
    if (s.media.filter((m) => m.type === MediaType.IMAGE).length === 0) {
      return 'At least one image is required before publishing.';
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Step components
// ------------------------------------------------------------------

interface StepProps {
  state: WizardState;
  update: (patch: Partial<WizardState> | ((prev: WizardState) => Partial<WizardState>)) => void;
}

function BasicInfoStep({ state, update }: StepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isRent = state.type === ListingType.RENT;
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Debounce the AI suggestion: wait until the user has been idle for 1.2s
  // and the dependent fields look usable. We don't fire on every keystroke.
  useEffect(() => {
    const city = state.city.trim();
    const propertyType = state.propertyType;
    const areaSqm = Number(state.area);
    const bedrooms = Number(state.bedrooms);
    const transactionType = state.type === ListingType.RENT ? 'rent' : 'sale';
    if (!city || !propertyType || !(areaSqm >= 20) || !(bedrooms >= 1)) {
      setPriceSuggestion(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestion(true);
      try {
        const suggestion = await aiApi.suggestPrice({
          city,
          propertyType,
          areaSqm,
          bedrooms,
          bathrooms: Number(state.bathrooms) || 1,
          district: state.district?.trim() || undefined,
          transactionType,
          amenities: state.amenityKeys,
        });
        setPriceSuggestion(suggestion);
      } catch {
        // Silent — pricing suggestion is an optional helper.
      } finally {
        setLoadingSuggestion(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    state.city,
    state.propertyType,
    state.area,
    state.bedrooms,
    state.bathrooms,
    state.district,
    state.type,
    state.amenityKeys,
  ]);

  // Background + border colour per confidence tier. Falls back to theme greys
  // when the tier is `low` so it still reads as informational, not warning.
  const tone =
    priceSuggestion?.confidence === 'high'
      ? { bg: alpha(theme.palette.success.main, 0.08), border: theme.palette.success.main }
      : priceSuggestion?.confidence === 'medium'
        ? { bg: alpha(theme.palette.warning.main, 0.08), border: theme.palette.warning.main }
        : { bg: alpha(theme.palette.grey[500], 0.08), border: theme.palette.divider };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField select fullWidth label="Property type" value={state.propertyType} onChange={(e) => update({ propertyType: e.target.value as PropertyType })}>
          {Object.values(PropertyType).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField select fullWidth label="Transaction type" value={state.type} onChange={(e) => update({ type: e.target.value as ListingType })}>
          <MenuItem value={ListingType.SALE}>Sale</MenuItem>
          <MenuItem value={ListingType.RENT}>Rent</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Title (Arabic)" value={state.titleAr} onChange={(e) => update({ titleAr: e.target.value })} dir="rtl" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Title (English)" value={state.titleEn} onChange={(e) => update({ titleEn: e.target.value })} />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField fullWidth multiline minRows={4} label="Description (Arabic)" value={state.descriptionAr} onChange={(e) => update({ descriptionAr: e.target.value })} dir="rtl" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth multiline minRows={4} label="Description (English)" value={state.descriptionEn} onChange={(e) => update({ descriptionEn: e.target.value })} />
      </Grid>

      <Grid item xs={6} sm={3}>
        <TextField fullWidth type="number" label="Price (SAR)" value={state.price} onChange={(e) => update({ price: e.target.value })} />
      </Grid>

      {/* AI Price Suggestion — full-width row directly under the price + area
       *  fields so the agent sees market context next to the value they enter. */}
      {(loadingSuggestion || priceSuggestion) && (
        <Grid item xs={12}>
          {loadingSuggestion && !priceSuggestion ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                {t('ai.analyzing', { defaultValue: 'Analyzing market prices…' })}
              </Typography>
            </Stack>
          ) : priceSuggestion ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: tone.bg,
                border: '1.5px solid',
                borderColor: tone.border,
              }}
            >
              <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                <AutoGraphIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  {t('ai.priceSuggestion', { defaultValue: 'AI Price Suggestion' })}
                </Typography>
                <Chip
                  label={t(`ai.confidence.${priceSuggestion.confidence}`, {
                    defaultValue: `${priceSuggestion.confidence} confidence`,
                  })}
                  size="small"
                  color={
                    priceSuggestion.confidence === 'high'
                      ? 'success'
                      : priceSuggestion.confidence === 'medium'
                        ? 'warning'
                        : 'default'
                  }
                  sx={{ ml: 'auto', fontSize: '0.7rem' }}
                />
              </Stack>

              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                {priceSuggestion.recommended.toLocaleString()} SAR
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                {t('ai.range', { defaultValue: 'Range' })}:{' '}
                {priceSuggestion.suggestedMin.toLocaleString()} –{' '}
                {priceSuggestion.suggestedMax.toLocaleString()} SAR
              </Typography>

              <Stack direction="row" spacing={3} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('ai.perSqm', { defaultValue: 'Per m²' })}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {priceSuggestion.pricePerSqm.toLocaleString()} SAR
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('ai.marketAvg', { defaultValue: 'Market average' })}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {priceSuggestion.marketAvg.toLocaleString()} SAR
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('ai.comparables', { defaultValue: 'Comparables' })}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {priceSuggestion.comparables}
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                {priceSuggestion.reasoning}
              </Typography>

              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => update({ price: String(priceSuggestion.recommended) })}
              >
                {t('ai.usePrice', { defaultValue: 'Use suggested price' })}
              </Button>
            </Box>
          ) : null}
        </Grid>
      )}
      {isRent && (
        <Grid item xs={6} sm={3}>
          <TextField select fullWidth label="Period" value={state.rentPeriod} onChange={(e) => update({ rentPeriod: e.target.value as RentPeriod })}>
            {Object.values(RentPeriod).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
      )}
      <Grid item xs={6} sm={3}><TextField fullWidth type="number" label="Area (m²)" value={state.area} onChange={(e) => update({ area: e.target.value })} /></Grid>
      <Grid item xs={6} sm={3}><TextField fullWidth type="number" label="Bedrooms" value={state.bedrooms} onChange={(e) => update({ bedrooms: e.target.value })} /></Grid>
      <Grid item xs={6} sm={3}><TextField fullWidth type="number" label="Bathrooms" value={state.bathrooms} onChange={(e) => update({ bathrooms: e.target.value })} /></Grid>
      <Grid item xs={6} sm={3}><TextField fullWidth type="number" label="Parking" value={state.parkingSpaces} onChange={(e) => update({ parkingSpaces: e.target.value })} /></Grid>
      <Grid item xs={6} sm={3}>
        <TextField select fullWidth label="Furnishing" value={state.furnishing} onChange={(e) => update({ furnishing: e.target.value as ListingFurnishing })}>
          <MenuItem value="">—</MenuItem>
          {Object.values(ListingFurnishing).map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={6} sm={3}><TextField fullWidth type="number" label="Year built" value={state.yearBuilt} onChange={(e) => update({ yearBuilt: e.target.value })} /></Grid>

      {SHORT_TERM_PROPERTY_TYPES.includes(state.propertyType) && (
        <Grid item xs={12}>
          <ShortTermSection state={state} update={update} />
        </Grid>
      )}
    </Grid>
  );
}

// ------------------------------------------------------------------
// Short-term rental section — surfaced under Step 1 (Basic info) only when
// the chosen property type is Airbnb-style (room / entire_home / hotel /
// chalet / farm / rest_house).
// ------------------------------------------------------------------

const SHORT_TERM_AMENITY_OPTIONS: Array<{ key: keyof ShortTermAmenities; label: string }> = [
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'pool', label: 'Pool' },
  { key: 'parking', label: 'Parking' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'ac', label: 'Air conditioning' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'tv', label: 'TV' },
  { key: 'washer', label: 'Washer' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'petsAllowed', label: 'Pets allowed' },
  { key: 'smokingAllowed', label: 'Smoking allowed' },
  { key: 'wheelchairAccessible', label: 'Wheelchair accessible' },
];

function ShortTermSection({ state, update }: StepProps) {
  const isHotel = HOTEL_PROPERTY_TYPES.includes(state.propertyType);
  const toggleAmenity = (key: keyof ShortTermAmenities) => {
    update((prev) => ({
      amenitiesDetailed: {
        ...prev.amenitiesDetailed,
        [key]: !prev.amenitiesDetailed[key],
      },
    }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 1, bgcolor: 'rgba(108,99,166,0.04)' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        Short-term rental details
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Guests will book this listing by the night. Configure stay rules, amenities, and pricing tiers.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="number"
            label="Daily rate (SAR)"
            value={state.dailyRate}
            onChange={(e) => update({ dailyRate: e.target.value })}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="number"
            label="Weekly rate (SAR, optional)"
            value={state.weeklyRate}
            onChange={(e) => update({ weeklyRate: e.target.value })}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="number"
            label="Minimum stay (nights)"
            inputProps={{ min: 1 }}
            value={state.minimumStay}
            onChange={(e) => update({ minimumStay: e.target.value })}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="number"
            label="Max guests"
            inputProps={{ min: 1, max: 99 }}
            value={state.maxGuests}
            onChange={(e) => update({ maxGuests: e.target.value })}
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="time"
            label="Check-in"
            InputLabelProps={{ shrink: true }}
            value={state.checkInTime}
            onChange={(e) => update({ checkInTime: e.target.value })}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            fullWidth
            type="time"
            label="Check-out"
            InputLabelProps={{ shrink: true }}
            value={state.checkOutTime}
            onChange={(e) => update({ checkOutTime: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Cancellation policy"
            value={state.cancellationPolicy}
            onChange={(e) => update({ cancellationPolicy: e.target.value as CancellationPolicy | '' })}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="flexible">Flexible — full refund up to 24 hours before</MenuItem>
            <MenuItem value="moderate">Moderate — full refund up to 5 days before</MenuItem>
            <MenuItem value="strict">Strict — 50% refund up to 7 days before</MenuItem>
          </TextField>
        </Grid>

        {isHotel && (
          <>
            <Grid item xs={6} sm={3}>
              <TextField
                select
                fullWidth
                label="Star rating"
                value={state.hotelStarRating}
                onChange={(e) => update({ hotelStarRating: e.target.value })}
              >
                <MenuItem value="">—</MenuItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={String(n)}>{n}★</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                label="Hotel name"
                value={state.hotelName}
                onChange={(e) => update({ hotelName: e.target.value })}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={state.instantBook}
                onChange={(e) => update({ instantBook: e.target.checked })}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Instant book</Typography>
                <Typography variant="caption" color="text.secondary">
                  Bookings auto-confirm without your approval. Disable to review each request first.
                </Typography>
              </Box>
            }
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Amenities</Typography>
          <Stack direction="row" flexWrap="wrap" rowGap={1} columnGap={1}>
            {SHORT_TERM_AMENITY_OPTIONS.map((a) => {
              const on = Boolean(state.amenitiesDetailed[a.key]);
              return (
                <Chip
                  key={a.key}
                  label={a.label}
                  onClick={() => toggleAmenity(a.key)}
                  color={on ? 'primary' : 'default'}
                  variant={on ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                />
              );
            })}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="House rules"
            placeholder="e.g. No parties, quiet hours after 10pm, no smoking indoors..."
            value={state.houseRules}
            onChange={(e) => update({ houseRules: e.target.value })}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

const MAP_LIBS: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

function LocationStep({ state, update }: StepProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: MAP_LIBS });

  const reverseGeocode = (lat: number, lng: number) => {
    if (!isLoaded || !window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;
      const components = results[0].address_components;
      const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name ?? '';
      update({
        city: get('locality') || get('administrative_area_level_1') || state.city,
        district: get('sublocality') || get('neighborhood') || state.district,
        street: get('route') || state.street,
        postalCode: get('postal_code') || state.postalCode,
      });
    });
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="City" value={state.city} onChange={(e) => update({ city: e.target.value })} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="District" value={state.district} onChange={(e) => update({ district: e.target.value })} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth label="Street" value={state.street} onChange={(e) => update({ street: e.target.value })} />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField fullWidth label="Building no." value={state.buildingNumber} onChange={(e) => update({ buildingNumber: e.target.value })} />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField fullWidth label="Postal code" value={state.postalCode} onChange={(e) => update({ postalCode: e.target.value })} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Drop a pin to set the exact location</Typography>
        {!apiKey ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Map pin picker unavailable (set <code>VITE_GOOGLE_MAPS_API_KEY</code>). Coordinates fall back to {state.lat.toFixed(4)}, {state.lng.toFixed(4)}.
            </Typography>
          </Paper>
        ) : !isLoaded ? (
          <Skeleton variant="rectangular" height={360} />
        ) : (
          <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <GoogleMap
              center={{ lat: state.lat, lng: state.lng }}
              zoom={13}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              onClick={(e) => {
                if (!e.latLng) return;
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                update({ lat, lng });
                reverseGeocode(lat, lng);
              }}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              <MarkerF
                position={{ lat: state.lat, lng: state.lng }}
                draggable
                onDragEnd={(e) => {
                  if (!e.latLng) return;
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  update({ lat, lng });
                  reverseGeocode(lat, lng);
                }}
              />
            </GoogleMap>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Pin: {state.lat.toFixed(5)}, {state.lng.toFixed(5)}
        </Typography>
      </Grid>
    </Grid>
  );
}

function MediaStep({ state, update, listingId }: StepProps & { listingId?: string }) {
  const [uploads, setUploads] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image dropzone
  const imageDz = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: true,
    onDrop: async (files) => {
      setUploadError(null);
      for (const file of files) {
        const localKey = `${file.name}-${file.size}`;
        setUploads((u) => ({ ...u, [localKey]: 5 }));
        try {
          const uploaded = await storageApi.uploadFile(file, 'image', 'listings');
          setUploads((u) => ({ ...u, [localKey]: 100 }));
          const newItem: MediaItem = {
            type: MediaType.IMAGE,
            url: uploaded.publicUrl,
            objectKey: uploaded.objectKey,
            position: 0, // re-numbered below from the latest media list
          };
          if (listingId) {
            const persisted = await listingsApi.addMedia(listingId, {
              type: MediaType.IMAGE,
              url: uploaded.publicUrl,
              position: newItem.position,
            });
            newItem.id = persisted.id;
          }
          // Functional update so concurrent uploads in the same drop don't
          // clobber each other via a stale `state.media` closure.
          update((s) => ({
            media: [...s.media, { ...newItem, position: s.media.length }],
          }));
        } catch (err) {
          setUploadError((err as Error).message);
        } finally {
          setUploads((u) => {
            const next = { ...u };
            delete next[localKey];
            return next;
          });
        }
      }
    },
  });

  // Video dropzone
  const videoDz = useDropzone({
    accept: { 'video/mp4': [], 'video/quicktime': [] },
    multiple: false,
    onDrop: async (files) => {
      const file = files[0];
      if (!file) return;
      try {
        const uploaded = await storageApi.uploadFile(file, 'video', 'listings');
        const newItem: MediaItem = {
          type: MediaType.VIDEO,
          url: uploaded.publicUrl,
          objectKey: uploaded.objectKey,
          position: state.media.length,
        };
        if (listingId) {
          const persisted = await listingsApi.addMedia(listingId, {
            type: MediaType.VIDEO,
            url: uploaded.publicUrl,
            position: newItem.position,
          });
          newItem.id = persisted.id;
        }
        update({ media: [...state.media, newItem] });
      } catch (err) {
        setUploadError((err as Error).message);
      }
    },
  });

  // 3D model dropzone (GLB/GLTF)
  const modelDz = useDropzone({
    accept: { 'model/gltf-binary': ['.glb'], 'model/gltf+json': ['.gltf'], 'application/octet-stream': ['.glb'] },
    multiple: false,
    onDrop: async (files) => {
      const file = files[0];
      if (!file) return;
      try {
        const uploaded = await storageApi.uploadFile(file, 'model_3d', 'tours');
        update({ modelUrl: uploaded.publicUrl, modelObjectKey: uploaded.objectKey });
      } catch (err) {
        setUploadError((err as Error).message);
      }
    },
  });

  // Reorder via simple drag indices
  const moveImage = (from: number, to: number) => {
    const images = state.media.filter((m) => m.type === MediaType.IMAGE);
    const others = state.media.filter((m) => m.type !== MediaType.IMAGE);
    const [moved] = images.splice(from, 1);
    images.splice(to, 0, moved);
    images.forEach((m, i) => (m.position = i));
    update({ media: [...images, ...others] });
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDropOnTile = (toIdx: number) => (e: React.DragEvent) => {
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIdx)) return;
    moveImage(fromIdx, toIdx);
  };

  const removeMedia = async (m: MediaItem) => {
    if (m.id && listingId) {
      try { await listingsApi.removeMedia(listingId, m.id); } catch { /* best-effort */ }
    }
    update({ media: state.media.filter((x) => x !== m) });
  };

  const setCover = (idx: number) => moveImage(idx, 0);

  const images = state.media.filter((m) => m.type === MediaType.IMAGE);
  const video = state.media.find((m) => m.type === MediaType.VIDEO);

  return (
    <Stack spacing={3}>
      {uploadError && <Alert severity="error">{uploadError}</Alert>}

      {/* Images */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Images</Typography>
        <Box
          {...imageDz.getRootProps()}
          sx={{
            p: 4, border: '2px dashed', borderColor: imageDz.isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2, textAlign: 'center', cursor: 'pointer', bgcolor: imageDz.isDragActive ? 'primary.50' : 'background.default',
          }}
        >
          <input {...imageDz.getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Drag & drop photos here, or click to choose. JPEG / PNG / WebP up to 10 MB.
          </Typography>
        </Box>
        {Object.keys(uploads).length > 0 && (
          <LinearProgress sx={{ mt: 1 }} />
        )}
        {images.length > 0 && (
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {images.map((m, idx) => (
              <Grid item xs={6} sm={4} md={3} key={`${m.url}-${idx}`}>
                <Paper
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                  onDragOver={onDragOver}
                  onDrop={handleDropOnTile(idx)}
                  sx={{
                    position: 'relative',
                    aspectRatio: '4 / 3',
                    overflow: 'hidden',
                    border: idx === 0 ? `2px solid` : 1,
                    borderColor: idx === 0 ? 'primary.main' : 'divider',
                    cursor: 'grab',
                  }}
                >
                  <Box
                    component="img"
                    src={m.url}
                    alt={m.caption ?? 'Listing photo'}
                    loading="lazy"
                    onError={(e) => {
                      // Surface broken-image URLs in the dev console so it's
                      // obvious when a publicUrl returns 404 / wrong CORS.
                      // eslint-disable-next-line no-console
                      console.error('[ListingWizard] image failed to load:', m.url, e);
                    }}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 4, insetInlineEnd: 4 }}>
                    <IconButton size="small" sx={{ bgcolor: 'background.paper' }} onClick={() => setCover(idx)} aria-label="set cover">
                      {idx === 0 ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" sx={{ bgcolor: 'background.paper' }} onClick={() => removeMedia(m)} aria-label="remove">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  {idx === 0 && (
                    <Chip
                      size="small"
                      label="Cover"
                      color="primary"
                      sx={{ position: 'absolute', bottom: 6, insetInlineStart: 6 }}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Video */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Video tour</Typography>
        <Box
          {...videoDz.getRootProps()}
          sx={{
            p: 3, border: '2px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center', cursor: 'pointer',
          }}
        >
          <input {...videoDz.getInputProps()} />
          <Typography variant="body2" color="text.secondary">
            {video ? `Video uploaded — ${video.url.split('/').pop()}` : 'Drag an MP4 file or click to choose. Max 500 MB.'}
          </Typography>
        </Box>
      </Box>

      {/* VR + AR */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>🥽 Virtual Reality Tour Link</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="https://… (Matterport, Kuula, etc.)"
          value={state.vrUrl}
          onChange={(e) => update({ vrUrl: e.target.value })}
        />
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>3D / AR model (.glb or .gltf)</Typography>
        <Box
          {...modelDz.getRootProps()}
          sx={{
            p: 3, border: '2px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center', cursor: 'pointer',
          }}
        >
          <input {...modelDz.getInputProps()} />
          <Typography variant="body2" color="text.secondary">
            {state.modelUrl
              ? `Model uploaded — ${state.modelUrl.split('/').pop()}`
              : 'Upload a GLB/GLTF model to enable AR. Max 50 MB.'}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}

function AmenitiesStep({ state, update }: StepProps) {
  const toggle = (key: string) => {
    const next = state.amenityKeys.includes(key)
      ? state.amenityKeys.filter((x) => x !== key)
      : [...state.amenityKeys, key];
    update({ amenityKeys: next });
  };
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tap the amenities this property offers. We'll surface them as filters on Search.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
        {AMENITY_OPTIONS.map((a) => {
          const selected = state.amenityKeys.includes(a.key);
          return (
            <Chip
              key={a.key}
              label={a.label}
              onClick={() => toggle(a.key)}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

function ComplianceStep({ state, update }: StepProps) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}><TextField fullWidth label="Permit / FAL number" value={state.permitNumber} onChange={(e) => update({ permitNumber: e.target.value })} /></Grid>
      <Grid item xs={12} sm={6}><TextField fullWidth label="REGA license number" value={state.regaNumber} onChange={(e) => update({ regaNumber: e.target.value })} /></Grid>
      <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="Permit expiry" InputLabelProps={{ shrink: true }} value={state.permitExpiry} onChange={(e) => update({ permitExpiry: e.target.value })} /></Grid>
      <Grid item xs={12} sm={6}>
        <TextField select fullWidth label="Preferred contact" value={state.contactPreference} onChange={(e) => update({ contactPreference: e.target.value as 'phone' | 'whatsapp' | 'email' })}>
          <MenuItem value="whatsapp">WhatsApp</MenuItem>
          <MenuItem value="phone">Phone</MenuItem>
          <MenuItem value="email">Email</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={state.visibility === 'public'}
              onChange={(_, v) => update({ visibility: v ? 'public' : 'unlisted' })}
            />
          }
          label="Public visibility (uncheck for unlisted / private link only)"
        />
      </Grid>
    </Grid>
  );
}

function ReviewStep({ state, update }: StepProps) {
  const sourceLocale = state.titleAr ? 'ar' : 'en';
  const sourceText = sourceLocale === 'ar' ? state.descriptionAr : state.descriptionEn;
  const enhanceMutation = useMutation({
    mutationFn: () => aiApi.enhanceDescription(sourceText, sourceLocale),
    onSuccess: (data) => {
      if (sourceLocale === 'ar') update({ descriptionAr: data.enhanced });
      else update({ descriptionEn: data.enhanced });
    },
  });

  const summary = useMemo(
    () => [
      ['Type', `${state.type} · ${state.propertyType}`],
      ['Title', state.titleEn || state.titleAr],
      ['Price', state.price ? `${Number(state.price).toLocaleString()} SAR${state.type === ListingType.RENT ? `/${state.rentPeriod || 'monthly'}` : ''}` : '—'],
      ['Area', state.area ? `${state.area} m²` : '—'],
      ['Bedrooms / Bathrooms', `${state.bedrooms || '—'} / ${state.bathrooms || '—'}`],
      ['City / District', `${state.city}${state.district ? `, ${state.district}` : ''}`],
      ['Coordinates', `${state.lat.toFixed(5)}, ${state.lng.toFixed(5)}`],
      ['Images', String(state.media.filter((m) => m.type === MediaType.IMAGE).length)],
      ['Amenities', state.amenityKeys.length ? state.amenityKeys.join(', ') : '—'],
      ['Permit', state.permitNumber || '—'],
      ['REGA license', state.regaNumber || '—'],
      ['Visibility', state.visibility],
    ],
    [state],
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Listing summary</Typography>
        <Button
          startIcon={<AutoAwesomeIcon />}
          onClick={() => enhanceMutation.mutate()}
          disabled={enhanceMutation.isPending || !sourceText}
          variant="outlined"
        >
          {enhanceMutation.isPending ? 'Enhancing…' : 'Enhance with AI'}
        </Button>
      </Stack>
      {enhanceMutation.isSuccess && !enhanceMutation.data?.live && (
        <Alert severity="info">AI returned a stub — set <code>OPENAI_API_KEY</code> on the backend to use the live model.</Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={1}>
          {summary.map(([k, v]) => (
            <Grid key={k} item xs={12} sm={6}>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', minWidth: 140 }}>{k}</Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>{v}</Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Description preview</Typography>
        <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-line' }}>
          {sourceText || <em>(empty)</em>}
        </Paper>
      </Box>
    </Stack>
  );
}
