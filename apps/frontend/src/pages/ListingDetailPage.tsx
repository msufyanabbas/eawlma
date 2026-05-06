import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import VrIcon from '@mui/icons-material/ViewInAr';
import VerifiedIcon from '@mui/icons-material/VerifiedRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined';
import StarIcon from '@mui/icons-material/Star';
import BedIcon from '@mui/icons-material/KingBedOutlined';
import BathIcon from '@mui/icons-material/BathtubOutlined';
import AreaIcon from '@mui/icons-material/SquareFootOutlined';
import LocationIcon from '@mui/icons-material/LocationOnOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ListingType, MediaType } from '@eawlma/shared-types';

import confetti from 'canvas-confetti';
import { listingsApi } from '@/api/listings.api';
import { searchApi } from '@/api/search.api';
import { agentsApi } from '@/api/agents.api';
import { inquiriesApi } from '@/api/inquiries.api';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { Reveal } from '@/components/global/Reveal';
import { MortgageCalculator } from '@/components/global/MortgageCalculator';
import { CommissionOathModal, hasLocallyAcceptedOath } from '@/components/global/CommissionOathModal';
import { fallbackImageForPropertyType } from '@/utils/listingImages';
import { getListingTitle, getListingDescription, getListingLocation } from '@/utils/listingText';
import { trackListingView } from '@/utils/recentlyViewed';

// ------------------------------------------------------------------
// 30 supported translation locales (mirrors backend's TRANSLATION_TARGET_LOCALES)
// ------------------------------------------------------------------

const SUPPORTED_LOCALES: Array<{ code: string; label: string }> = [
  { code: 'ar', label: 'العربية' },   { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },   { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },    { code: 'fa', label: 'فارسی' },
  { code: 'ur', label: 'اردو' },      { code: 'ja', label: '日本語' },
  { code: 'zh-Hans', label: '简体中文' }, { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ko', label: '한국어' },    { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },     { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' }, { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },       { code: 'tl', label: 'Filipino' },
  { code: 'nl', label: 'Nederlands' }, { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },   { code: 'no', label: 'Norsk' },
  { code: 'da', label: 'Dansk' },     { code: 'fi', label: 'Suomi' },
  { code: 'el', label: 'Ελληνικά' },  { code: 'he', label: 'עברית' },
];

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function ListingDetailPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const params = useParams({ strict: false }) as { id?: string };
  // Fallback to the URL pathname when TanStack Router hasn't filled `params`
  // yet (which happens for the first render after a fresh navigation). Without
  // this, `id` was briefly empty and an early-return redirect kicked us back
  // to /search.
  const pathTail =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').filter(Boolean).pop()
      : undefined;
  const id = params.id || pathTail || '';

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSaved = useSavedStore((s) => s.isSaved(id));
  const toggleSaved = useSavedStore((s) => s.toggle);

  const navigate = useNavigate();
  const [displayLocale, setDisplayLocale] = useState<string>(i18n.language);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const showSnackbar = (message: string, severity: 'info' | 'warning' = 'info') =>
    setSnackbar({ open: true, message, severity });

  const listingQuery = useQuery({
    queryKey: ['listings', id],
    queryFn: () => listingsApi.getById(id),
    enabled: Boolean(id),
    retry: false,
  });
  const listing = listingQuery.data;

  // Track the visit in localStorage for the "Recently viewed" home rail.
  useEffect(() => {
    if (id) trackListingView(id);
  }, [id]);

  const similarQuery = useQuery({
    queryKey: ['search', 'similar', listing?.city, listing?.propertyType],
    queryFn: () =>
      searchApi.listings({
        city: listing?.city,
        propertyTypes: listing ? [listing.propertyType] : undefined,
        limit: 6,
      }),
    enabled: Boolean(listing),
  });

  // Fetch the public agent profile for the listing's owner so the agent card
  // can show the real name + initials instead of the generic "Agent" label.
  const agentQuery = useQuery({
    queryKey: ['agents', listing?.ownerId],
    queryFn: () => agentsApi.getById(listing!.ownerId),
    enabled: Boolean(listing?.ownerId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const agent = agentQuery.data;

  // Pick title/description in the chosen translation locale via the shared
  // util — handles stub-prefixed translations + mojibake-corrupted seeds.
  const localized = useMemo(() => {
    if (!listing) return { title: '', description: '' };
    return {
      title: getListingTitle(listing, displayLocale),
      description: getListingDescription(listing, displayLocale),
    };
  }, [listing, displayLocale]);

  // Inquiry form state (shared between sticky sidebar + mobile sheet) — for
  // authenticated users we pre-fill from the auth store so the only required
  // field is the message body. Anonymous visitors still type name/email/phone
  // by hand.
  const sessionUser = useAuthStore((s) => s.user);
  const [inqMessage, setInqMessage] = useState('');
  const [inqName, setInqName] = useState(
    sessionUser ? `${sessionUser.firstName} ${sessionUser.lastName}`.trim() : '',
  );
  const [inqEmail, setInqEmail] = useState(sessionUser?.email ?? '');
  const [inqPhone, setInqPhone] = useState('');
  const [inqMethod, setInqMethod] = useState<'phone' | 'email' | 'whatsapp'>('whatsapp');
  const [inqSuccess, setInqSuccess] = useState(false);
  const [oathOpen, setOathOpen] = useState(false);

  const inquiryMutation = useMutation({
    mutationFn: () =>
      inquiriesApi.create({
        listingId: id,
        message: inqMessage,
        ...(isAuthenticated ? {} : { guestName: inqName, guestEmail: inqEmail, guestPhone: inqPhone }),
        preferredContactMethod: inqMethod,
      }),
    onSuccess: () => {
      setInqSuccess(true);
      setInqMessage('');
      // Celebrate the lead 🎉 — fires a brief confetti burst from both edges
      // of the viewport, then a centered burst, then resolves itself.
      const fire = (originX: number) =>
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { x: originX, y: 0.5 },
          colors: ['#1B4FD8', '#F59E0B', '#10B981', '#3B6CE0'],
          disableForReducedMotion: true,
        });
      fire(0.1);
      fire(0.9);
      setTimeout(() => fire(0.5), 250);
    },
  });

  if (listingQuery.isLoading) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: 4 }}>
        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="text" width="50%" height={48} />
        <Skeleton variant="text" width="30%" />
        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" width="60%" height={400} />
          <Skeleton variant="rectangular" width="40%" height={400} />
        </Stack>
      </Container>
    );
  }
  if (listingQuery.isError || !listing) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: 8 }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            p: { xs: 6, md: 8 },
            textAlign: 'center',
            maxWidth: 560,
            mx: 'auto',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Listing not found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This property may have been removed or the link is no longer valid.
          </Typography>
          <Button variant="contained" onClick={() => void navigate({ to: '/search' as never })}>
            Back to search
          </Button>
        </Box>
      </Container>
    );
  }

  // Guard every nested array — media can come back undefined for legacy rows.
  const allMedia = listing.media ?? [];
  const realImages = allMedia.filter((m) => m?.type === MediaType.IMAGE);
  // When no agent-uploaded images exist, surface a property-type-aware
  // Unsplash placeholder so the gallery never renders as a blank grey block.
  const fallbackUrl = fallbackImageForPropertyType(listing.propertyType);
  const images =
    realImages.length > 0
      ? realImages
      : [{ id: 'fallback', url: fallbackUrl, thumbnailUrl: fallbackUrl } as unknown as (typeof realImages)[number]];
  const video = allMedia.find((m) => m?.type === MediaType.VIDEO);
  const tour360 = allMedia.find((m) => m?.type === MediaType.TOUR_360);
  const cover = images[0]?.url;

  const isSale = listing.type === ListingType.SALE;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Eawlma — ${localized.title} — ${window.location.href}`,
  )}`;

  // VR / AR feedback handlers — surface a Snackbar when the listing or the
  // current device cannot honour the action, so users aren't left wondering.
  const handleEnterVR = () => {
    if (!tour360?.url) {
      showSnackbar(
        'No virtual tour available for this listing yet. Ask the agent to add one.',
        'info',
      );
      return;
    }
    window.open(tour360.url, '_blank', 'noopener');
  };
  const handleViewAR = () => {
    if (!tour360?.url) {
      showSnackbar('No AR model available for this listing yet.', 'info');
      return;
    }
    if (typeof navigator !== 'undefined' && !('xr' in navigator)) {
      showSnackbar('AR is not supported on this device/browser.', 'warning');
      return;
    }
    window.open(tour360.url, '_blank', 'noopener');
  };

  // "Messages" CTA from the agent card — gate by auth, forward returnTo,
  // and deep-link the dashboard messages page to this listing's owner.
  // Conversation creation requires an initial message body so we don't try
  // to auto-create a thread here; MessagesPage shows a friendly Start-
  // conversation prompt back to this listing's inquiry form when no thread
  // exists yet.
  const handleMessageAgent = () => {
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(window.location.pathname);
      void navigate({ to: `/auth/login?returnTo=${returnTo}` as never });
      return;
    }
    void navigate({ to: `/dashboard/messages?agentId=${listing.ownerId}` as never });
  };

  return (
    <Box>
      <Helmet>
        <title>{localized.title} — {t('app.name')}</title>
        <meta name="description" content={localized.description.slice(0, 160)} />
      </Helmet>

      {/* ---------------- Image gallery — Airbnb 60/40 split ---------------- */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, mt: 3 }}>
        {images.length <= 1 ? (
          // Single-image fallback — full-width with a subtle gradient veil
          <Box
            onClick={() => images.length > 0 && (setGalleryIdx(0), setGalleryOpen(true))}
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 280, md: 460 },
              borderRadius: 3,
              overflow: 'hidden',
              cursor: cover ? 'pointer' : 'default',
              backgroundImage: cover ? `url(${cover})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              bgcolor: 'grey.100',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.35) 100%)',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '3fr 1fr 1fr' },
              gridTemplateRows: { md: '1fr 1fr' },
              gap: 1,
              borderRadius: 3,
              overflow: 'hidden',
              height: { xs: 320, md: 480 },
            }}
          >
            <Box
              onClick={() => (setGalleryIdx(0), setGalleryOpen(true))}
              sx={{
                gridRow: { md: '1 / span 2' },
                bgcolor: 'grey.200',
                backgroundImage: cover ? `url(${cover})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: cover ? 'pointer' : 'default',
              }}
            />
            {images.slice(1, 5).map((m, i) => (
              <Box
                key={m.id}
                onClick={() => (setGalleryIdx(i + 1), setGalleryOpen(true))}
                sx={{
                  bgcolor: 'grey.200',
                  backgroundImage: `url(${m.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  display: { xs: i < 1 ? 'block' : 'none', md: 'block' },
                  position: 'relative',
                }}
              />
            ))}

            {/* "Show all photos" overlay button — bottom-end, always available */}
            <Button
              variant="contained"
              size="small"
              onClick={() => (setGalleryIdx(0), setGalleryOpen(true))}
              sx={{
                position: 'absolute',
                bottom: 16,
                insetInlineEnd: 16,
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'text.primary',
                fontWeight: 700,
                px: 1.75,
                '&:hover': { bgcolor: '#FFFFFF' },
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              }}
            >
              {`Show all photos (${images.length})`}
            </Button>
          </Box>
        )}
      </Container>

      {/* ---------------- Title + actions ---------------- */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, mt: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color={isSale ? 'primary' : 'success'}
                label={isSale ? t('listing.forSale') : t('listing.forRent')}
              />
              {listing.isFeatured && <Chip size="small" color="secondary" icon={<StarIcon sx={{ fontSize: 14 }} />} label={t('listing.featured')} />}
              <Typography variant="caption" color="text.secondary">{listing.referenceCode}</Typography>
              {/* View counter — small badge near reference code */}
              <Chip
                size="small"
                variant="outlined"
                label={`👁 ${(listing.viewCount ?? 0).toLocaleString(i18n.language)} views`}
                sx={{ height: 22, fontSize: 11, color: 'text.secondary', bgcolor: 'transparent' }}
              />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              {localized.title}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
              <LocationIcon fontSize="small" />
              <Typography variant="body2">
                {getListingLocation(listing)}{listing.region ? `, ${listing.region}` : ''}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title={isSaved ? t('listing.saved') : t('listing.save')}>
              <IconButton onClick={() => toggleSaved(id)} aria-label="save listing">
                {isSaved ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={t('listing.share')}>
              <IconButton onClick={() => navigator.share?.({ title: localized.title, url: window.location.href }).catch(() => undefined)}>
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {Number(listing.price).toLocaleString(i18n.language)} {t('listing.currency')}
              {!isSale && listing.rentPeriod ? <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>/{listing.rentPeriod}</Typography> : null}
            </Typography>
          </Stack>
        </Stack>
      </Container>

      {/* ---------------- Body grid ---------------- */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, mt: 4, pb: 8 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
          <Reveal variant="fadeRight">
            {/* Quick stats */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Stack direction="row" spacing={4} flexWrap="wrap" rowGap={2}>
                {listing.bedrooms !== null && <FeatureStat icon={<BedIcon />} label={t('listing.bedroom_plural')} value={listing.bedrooms} />}
                {listing.bathrooms !== null && <FeatureStat icon={<BathIcon />} label={t('listing.bathroom_plural')} value={listing.bathrooms} />}
                {listing.area !== null && <FeatureStat icon={<AreaIcon />} label={t('listing.area')} value={`${Number(listing.area).toLocaleString()} ${t('listing.areaUnit')}`} />}
                {listing.floorNumber !== null && <FeatureStat label="Floor" value={listing.floorNumber} />}
                {listing.parkingSpaces !== null && <FeatureStat label="Parking" value={listing.parkingSpaces} />}
                {listing.yearBuilt !== null && <FeatureStat label="Built" value={listing.yearBuilt} />}
              </Stack>
            </Paper>

            {/* VR/AR — VISUALLY PROMINENT */}
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              sx={{
                position: 'relative',
                p: { xs: 3, md: 4 },
                mb: 4,
                borderRadius: 4,
                color: 'common.white',
                background: `linear-gradient(135deg, #0F172A 0%, ${theme.palette.primary.dark} 50%, ${theme.palette.primary.main} 100%)`,
                overflow: 'hidden',
                boxShadow: '0 24px 56px rgba(15,23,42,0.32)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(circle at 80% 20%, rgba(245,158,11,0.32) 0%, rgba(245,158,11,0) 60%)',
                }}
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, position: 'relative' }}>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: alpha('#F59E0B', 0.22),
                    border: '1px solid rgba(245,158,11,0.45)',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  ✨ Premium
                </Box>
                <Typography variant="overline" sx={{ letterSpacing: 0.8 }}>
                  AR / VR Experience
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, position: 'relative' }}>
                🥽 Immersive VR & AR Property Experience
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.85, mb: 3, maxWidth: 560, position: 'relative' }}>
                Step inside this property from anywhere in the world. Take a 360° virtual tour or
                place a true-to-scale 3D model right in your living room.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ position: 'relative' }}>
                <Button
                  size="large"
                  startIcon={<VrIcon />}
                  onClick={handleEnterVR}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    border: '2px solid #FFFFFF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    px: 3,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
                  }}
                >
                  Enter VR Tour
                </Button>
                <Button
                  size="large"
                  onClick={handleViewAR}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.7)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    px: 3,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', borderColor: '#FFFFFF' },
                  }}
                >
                  View in AR
                </Button>
              </Stack>

              {/* model-viewer or fallback message */}
              <Box sx={{ mt: 3, position: 'relative' }}>
                {tour360?.url ? (
                  <Box
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      bgcolor: 'common.black',
                      aspectRatio: '16 / 9',
                    }}
                  >
                    <model-viewer
                      src={tour360.url}
                      alt={localized.title}
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      auto-rotate
                      camera-controls
                      shadow-intensity="1"
                      style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    The agent hasn't uploaded a 360°/3D tour for this listing yet.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Video */}
            {video && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  Video tour
                </Typography>
                <Box sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'common.black', aspectRatio: '16 / 9' }}>
                  <video src={video.url} controls style={{ width: '100%', height: '100%' }} />
                </Box>
              </Box>
            )}

            {/* Description + AI translation switch */}
            <Box sx={{ mb: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {t('listing.description')}
                </Typography>
                <TextField
                  select
                  size="small"
                  value={displayLocale}
                  onChange={(e) => setDisplayLocale(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  {SUPPORTED_LOCALES.map((l) => (
                    <MenuItem key={l.code} value={l.code}>
                      {l.label} {l.code === listing.sourceLocale ? '(source)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {localized.description}
              </Typography>
            </Box>

            {/* Mortgage calculator — sale listings only (rent has no loan to amortise) */}
            {isSale && (
              <Box sx={{ mb: 4 }}>
                <MortgageCalculator price={Number(listing.price)} currency={String(listing.currency || t('listing.currency'))} />
              </Box>
            )}

            {/* REGA / compliance — surfaces a license badge when the listing or
             *  reference code is set. The lavender chip flags it as verified. */}
            {(() => {
              const regaNumber =
                (listing as unknown as { regaNumber?: string }).regaNumber ?? listing.referenceCode;
              if (!regaNumber) return null;
              return (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    p: 2,
                    mb: 4,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'success.light',
                    bgcolor: alpha(theme.palette.success.main, 0.06),
                  }}
                >
                  <VerifiedIcon sx={{ color: 'success.main' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      REGA License
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {regaNumber}
                    </Typography>
                  </Box>
                  <Chip label="Verified" color="success" size="small" />
                </Box>
              );
            })()}

            {/* Amenities */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {t('listing.amenities')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                {listing.hasPool && <Chip label="Pool" />}
                {listing.hasGarden && <Chip label="Garden" />}
                {listing.hasGym && <Chip label="Gym" />}
                {listing.hasElevator && <Chip label="Elevator" />}
                {listing.hasMaidRoom && <Chip label="Maid room" />}
                {listing.hasDriverRoom && <Chip label="Driver room" />}
                {listing.hasCentralAC && <Chip label="Central AC" />}
                {listing.hasKitchenAppliances && <Chip label="Kitchen appliances" />}
                {listing.hasSecurity && <Chip label="24/7 security" />}
                {listing.isCornerUnit && <Chip label="Corner unit" />}
              </Stack>
            </Box>

            {/* Map */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {t('listing.location')}
              </Typography>
              <ListingMap lat={Number(listing.lat)} lng={Number(listing.lng)} />
            </Box>
          </Reveal>
          </Grid>

          {/* ---------------- Sticky inquiry sidebar — lavender accent border ---------------- */}
          <Grid item xs={12} md={4}>
          <Reveal variant="fadeLeft" delay={0.1}>
            <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
              {/* Agent card */}
              <Paper
                sx={{
                  p: 3,
                  mb: 3,
                  borderInlineStart: 4,
                  borderColor: 'primary.main',
                  boxShadow: '0 6px 20px rgba(108,99,166,0.10)',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                  <Avatar
                    src={agent?.avatarUrl ?? undefined}
                    sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800 }}
                  >
                    {agent
                      ? `${(agent.firstName?.[0] ?? '').toUpperCase()}${(agent.lastName?.[0] ?? '').toUpperCase()}` || 'A'
                      : 'A'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                        {agent
                          ? `${agent.firstName} ${agent.lastName}`.trim() || t('listing.agent')
                          : t('listing.agent')}
                      </Typography>
                      {agent?.identityVerified && (
                        <VerifiedIcon sx={{ color: 'success.main', fontSize: 18 }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <StarIcon key={n} sx={{ color: 'warning.main', fontSize: 14 }} />
                      ))}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>4.8</Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Chip
                  icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                  label="Responds within 2 hours"
                  size="small"
                  sx={{
                    mb: 2,
                    bgcolor: 'success.light',
                    color: 'success.dark',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'success.dark' },
                  }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    component={Link}
                    to={`/agents/${listing.ownerId}` as never}
                    fullWidth
                    variant="outlined"
                    size="small"
                  >
                    View profile
                  </Button>
                  <Button
                    startIcon={<ChatIcon />}
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={handleMessageAgent}
                  >
                    {t('nav.messages')}
                  </Button>
                </Stack>
              </Paper>

              {/* Inquiry form */}
              <Paper
                sx={{
                  p: 3,
                  borderInlineStart: 4,
                  borderColor: 'primary.main',
                  boxShadow: '0 6px 20px rgba(108,99,166,0.10)',
                }}
              >
                {inqSuccess ? (
                  <Stack spacing={2} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: 'success.light',
                        color: 'success.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32,
                      }}
                    >
                      ✓
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Your inquiry has been sent!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The agent will contact you shortly. You'll also receive a confirmation
                      email at the address you provided.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: '100%' }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ChatIcon />}
                        onClick={handleMessageAgent}
                        sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
                      >
                        {t('nav.messages')}
                      </Button>
                      <Button fullWidth variant="outlined" onClick={() => setInqSuccess(false)}>
                        Send another inquiry
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  {t('listing.scheduleTour')}
                </Typography>
                {!isAuthenticated && (
                  <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                    <TextField size="small" label="Your name" value={inqName} onChange={(e) => setInqName(e.target.value)} />
                    <TextField size="small" type="email" label={t('auth.email')} value={inqEmail} onChange={(e) => setInqEmail(e.target.value)} />
                    <TextField size="small" label={t('auth.phone')} value={inqPhone} onChange={(e) => setInqPhone(e.target.value)} placeholder="+9665XXXXXXXX" />
                  </Stack>
                )}
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  placeholder={`I'm interested in ${listing.referenceCode}…`}
                  value={inqMessage}
                  onChange={(e) => setInqMessage(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Preferred contact"
                  value={inqMethod}
                  onChange={(e) => setInqMethod(e.target.value as 'phone' | 'email' | 'whatsapp')}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </TextField>
                {inquiryMutation.isError && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {(inquiryMutation.error as Error).message}
                  </Alert>
                )}
                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={inquiryMutation.isPending || inqMessage.trim().length === 0}
                    onClick={() => {
                      // Buyers must accept the commission oath before sending
                      // their first inquiry. The modal records acceptance once
                      // and we cache it locally so subsequent sends don't gate.
                      if (!hasLocallyAcceptedOath('buyer_purchase')) {
                        setOathOpen(true);
                        return;
                      }
                      inquiryMutation.mutate();
                    }}
                    sx={{
                      background: theme.eawlma.gradient,
                      fontWeight: 700,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                      },
                    }}
                  >
                    {inquiryMutation.isPending ? t('common.loading') : 'Send inquiry'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener"
                  >
                    {t('listing.whatsapp')}
                  </Button>
                  <Button fullWidth variant="text" startIcon={<PhoneIcon />}>
                    {t('listing.callAgent')}
                  </Button>
                </Stack>
                  </>
                )}
              </Paper>
            </Box>
          </Reveal>
          </Grid>
        </Grid>

        {/* Similar listings */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            Similar listings
          </Typography>
          <Grid container spacing={3}>
            {similarQuery.isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Grid key={i} item xs={12} sm={6} md={4}><SkeletonCard /></Grid>
                ))
              : (similarQuery.data?.data ?? [])
                  .filter((l) => l.id !== id)
                  .slice(0, 4)
                  .map((l, i) => (
                    <Grid key={l.id} item xs={12} sm={6} md={3}>
                      <Reveal delay={i * 0.08}>
                        <ListingCard listing={l} />
                      </Reveal>
                    </Grid>
                  ))}
          </Grid>
        </Box>
      </Container>

      {/* Mobile bottom CTA sheet */}
      {!isDesktop && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            insetInline: 0,
            zIndex: 5,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            p: 1.5,
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="contained" startIcon={<ChatIcon />}>{t('nav.messages')}</Button>
            <Button fullWidth variant="outlined" color="success" startIcon={<WhatsAppIcon />} href={whatsappLink}>
              {t('listing.whatsapp')}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Lightbox */}
      <Dialog
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#000', position: 'relative' } }}
      >
        <IconButton
          onClick={() => setGalleryOpen(false)}
          sx={{ position: 'absolute', top: 8, insetInlineEnd: 8, color: 'common.white', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundImage: `url(${images[galleryIdx]?.url ?? ''})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
          <ImageList cols={Math.min(images.length, 6)} gap={6} sx={{ mt: 2 }}>
            {images.map((m, i) => (
              <ImageListItem
                key={m.id}
                onClick={() => setGalleryIdx(i)}
                sx={{
                  cursor: 'pointer',
                  border: i === galleryIdx ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                }}
              >
                <img src={m.thumbnailUrl ?? m.url} alt={`thumb-${i}`} loading="lazy" />
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      </Dialog>

      {/* VR / AR / message feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CommissionOathModal
        open={oathOpen}
        oathType="buyer_purchase"
        listingId={id}
        onClose={() => setOathOpen(false)}
        onAccept={() => {
          setOathOpen(false);
          inquiryMutation.mutate();
        }}
      />
    </Box>
  );
}

// ------------------------------------------------------------------
// Helper components
// ------------------------------------------------------------------

function FeatureStat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <Box sx={{ minWidth: 96 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5 }}>
        {icon}
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}

const MAP_LIBRARIES: ('places')[] = ['places'];

function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: MAP_LIBRARIES });
  if (!apiKey) {
    return (
      <Paper sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">Map preview unavailable (no Google Maps API key)</Typography>
      </Paper>
    );
  }
  if (!isLoaded) return <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />;
  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', height: 360, border: 1, borderColor: 'divider' }}>
      <GoogleMap
        center={{ lat, lng }}
        zoom={15}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        <MarkerF position={{ lat, lng }} />
      </GoogleMap>
    </Box>
  );
}
