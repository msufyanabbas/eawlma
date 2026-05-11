import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
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
import { reviewsApi } from '@/api/reviews.api';
import { PhotoGallery } from '@/components/global/PhotoGallery';
import { inquiriesApi } from '@/api/inquiries.api';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { Reveal } from '@/components/global/Reveal';
import { MortgageCalculator } from '@/components/global/MortgageCalculator';
import { CommissionOathModal, hasLocallyAcceptedOath } from '@/components/global/CommissionOathModal';
import { fallbackImageForPropertyType, listingGalleryUrls } from '@/utils/listingImages';
import { getListingTitle, getListingDescription, getListingLocation } from '@/utils/listingText';
import { trackListingView } from '@/utils/recentlyViewed';
import { formatHijriAndGregorian } from '@/utils/hijri';
import { EjarContractDialog } from '@/components/global/EjarContractDialog';
import { BookingCalendar } from '@/components/global/BookingCalendar';
import { priceTrendsApi } from '@/api/priceTrends.api';
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

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
// Price-fairness helper
// ------------------------------------------------------------------

interface FairnessResult {
  bucket: 'great' | 'fair' | 'above';
  marketPpsm: number;
  listingPpsm: number;
}

interface ListingLike {
  id: string;
  price: number | string;
  area: number | string | null;
  city: string;
  propertyType: string;
}

// Compare a listing's price-per-m² to peers in the same city + property type.
// Returns null when there's no signal (no area or fewer than 3 comparable peers).
function computeFairness(
  listing: ListingLike | undefined | null,
  peers: ListingLike[],
): FairnessResult | null {
  if (!listing) return null;
  const area = Number(listing.area);
  const price = Number(listing.price);
  if (!area || !price || !Number.isFinite(area) || !Number.isFinite(price)) return null;

  const ppsmList = peers
    .filter((p) => p.id !== listing.id && p.city === listing.city && p.propertyType === listing.propertyType)
    .map((p) => {
      const a = Number(p.area);
      const pp = Number(p.price);
      return a > 0 && pp > 0 ? pp / a : null;
    })
    .filter((v): v is number => v != null);

  if (ppsmList.length < 3) return null;
  const marketPpsm = ppsmList.reduce((a, b) => a + b, 0) / ppsmList.length;
  const listingPpsm = price / area;
  const ratio = listingPpsm / marketPpsm;

  let bucket: FairnessResult['bucket'];
  if (ratio < 0.9) bucket = 'great';
  else if (ratio <= 1.1) bucket = 'fair';
  else bucket = 'above';

  return { bucket, marketPpsm, listingPpsm };
}

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
  // to /search. Regex match is more robust than `.split('/').pop()` against
  // trailing slashes or query/hash suffixes.
  const pathMatch =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/\/listings\/([^/?#]+)/)?.[1]
      : undefined;
  const id = params.id || pathMatch || '';

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSaved = useSavedStore((s) => s.isSaved(id));
  const toggleSaved = useSavedStore((s) => s.toggle);

  const navigate = useNavigate();
  const [displayLocale, setDisplayLocale] = useState<string>(i18n.language);
  const [ejarOpen, setEjarOpen] = useState(false);
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

  if (listingQuery.isLoading || (id && listingQuery.isFetching && !listing)) {
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
  // Show not-found UI only when the query has actually failed or no id could
  // be resolved at all — never auto-redirect, the user can choose to leave.
  if (!id || listingQuery.isError || !listing) {
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
  // Pad the gallery with curated Unsplash fallbacks so the Airbnb-style 1+4
  // grid + "Show all 10 photos" CTA always have material to render — even on
  // seed listings that only ship one uploaded photo.
  const fallbackUrl = fallbackImageForPropertyType(listing.propertyType);
  const galleryUrls = listingGalleryUrls(listing, 10);
  const images: Array<{ id: string; url: string; thumbnailUrl?: string | null }> =
    realImages.length >= 5
      ? realImages
      : galleryUrls.map((url, i) => {
          // Prefer the real ListingMedia object when we have one — keeps its
          // id stable for downstream `key`s — otherwise synthesize a stable id.
          const real = realImages[i];
          if (real) return real as { id: string; url: string; thumbnailUrl?: string | null };
          return { id: `fallback-${i}`, url, thumbnailUrl: url };
        });
  const video = allMedia.find((m) => m?.type === MediaType.VIDEO);
  const tour360 = allMedia.find((m) => m?.type === MediaType.TOUR_360);
  const cover = images[0]?.url;

  const isSale = listing.type === ListingType.SALE;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Eawlma — ${localized.title} — ${window.location.href}`,
  )}`;

  // The agent looking at their own listing must not see the inquiry form —
  // we surface an "Edit listing" CTA in its place. Cross-checks owner *and*
  // agent ids since some seeded rows separate the two roles.
  const ownerLike = (listing as unknown as { agentId?: string }).agentId ?? listing.ownerId;
  const isOwnListing = Boolean(sessionUser?.id && (sessionUser.id === listing.ownerId || sessionUser.id === ownerLike));

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
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${localized.title} — ${t('app.name')}`} />
        <meta property="og:description" content={localized.description.slice(0, 160)} />
        <meta property="og:image" content={images[0]?.url ?? '/apps/frontend/assets/logo.svg'} />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:site_name" content="Eawlma" />
        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${localized.title} — ${t('app.name')}`} />
        <meta name="twitter:description" content={localized.description.slice(0, 160)} />
        <meta name="twitter:image" content={images[0]?.url ?? ''} />
        {/* JSON-LD structured data — RealEstateListing */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: localized.title,
            description: localized.description,
            price: Number(listing.price),
            priceCurrency: listing.currency ?? 'SAR',
            address: {
              '@type': 'PostalAddress',
              addressLocality: listing.city,
              addressRegion: listing.region,
              addressCountry: listing.country ?? 'SA',
            },
            image: images.map((m) => m.url).slice(0, 6),
            url: typeof window !== 'undefined' ? window.location.href : '',
          })}
        </script>
      </Helmet>

      {/* ---------------- Image gallery — Airbnb 60/40 split ---------------- */}
      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, mt: 3 }}>
        <PhotoGallery photos={images.map((m) => m.url)} alt={localized.title} />
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
            {(listing.publishedAt ?? listing.createdAt) && (
              <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary" sx={{ mt: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  {formatHijriAndGregorian(
                    listing.publishedAt ?? listing.createdAt,
                    i18n.language,
                  )}
                </Typography>
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
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
            {(() => {
              const fairness = computeFairness(listing, similarQuery.data?.data ?? []);
              if (!fairness) return null;
              const chipColor =
                fairness.bucket === 'great'
                  ? 'success'
                  : fairness.bucket === 'fair'
                    ? 'info'
                    : 'warning';
              return (
                <Tooltip
                  title={`${t('listing.fairPrice.marketAvg')}: ${Math.round(fairness.marketPpsm).toLocaleString(i18n.language)} ${t('listing.currency')}`}
                >
                  <Chip
                    color={chipColor}
                    label={t(`listing.fairPrice.${fairness.bucket}`)}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Tooltip>
              );
            })()}
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

            {/* Mini market sparkline — local price trend */}
            <PriceTrendSparkline city={listing.city} type={listing.propertyType} />


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

            <ShortTermInfoSections listing={listing} />

            <ListingReviewsSection listingId={listing.id} />

            {/* Mortgage calculator — sale listings only (rent has no loan to amortise) */}
            {isSale && (
              <Box sx={{ mb: 4 }}>
                <MortgageCalculator price={Number(listing.price)} currency={String(listing.currency || t('listing.currency'))} />
              </Box>
            )}

            {/* Rent-only — Ejar contract + Dufaat installments callouts. */}
            {!isSale && isAuthenticated && (
              <Stack spacing={2} sx={{ mb: 4 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha('#009639', 0.3),
                    bgcolor: alpha('#009639', 0.06),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, color: '#007A2E' }}>
                      📜 {t('ejar.createContract')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('ejar.calloutBody')}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => setEjarOpen(true)}
                    sx={{ bgcolor: '#009639', '&:hover': { bgcolor: '#007A2E' } }}
                  >
                    {t('ejar.createContract')}
                  </Button>
                </Box>

                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
                    💳 {t('dufaat.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('dufaat.calloutBody', {
                      monthly: Math.round(Number(listing.price) / 12).toLocaleString(i18n.language),
                      annual: Number(listing.price).toLocaleString(i18n.language),
                      currency: t('listing.currency'),
                    })}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    component={Link}
                    to="/dashboard/dufaat"
                  >
                    {t('dufaat.applyNow')}
                  </Button>
                </Box>
              </Stack>
            )}

            {/* REGA / compliance — required by Saudi law for property listings.
             *  Rendered as a high-contrast banner so buyers immediately see
             *  the listing is registered with the General Real Estate Authority. */}
            {(() => {
              const regaNumber =
                (listing as unknown as { regaNumber?: string }).regaNumber ?? listing.referenceCode;
              if (!regaNumber) return null;
              return (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2.5,
                    mb: 4,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: 'success.main',
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.18)}`,
                  }}
                >
                  <VerifiedIcon sx={{ color: 'success.main', fontSize: 36, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: 'success.dark',
                        lineHeight: 1.2,
                      }}
                    >
                      {t('listing.regaLicensed')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                    >
                      {t('listing.regaLicense')}: <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>{regaNumber}</Box>
                    </Typography>
                  </Box>
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
                {agent?.isSuperhost && (
                  <Chip
                    icon={<StarIcon sx={{ fontSize: 14, color: '#FFFFFF !important' }} />}
                    label={`${t('booking.superhost', { defaultValue: 'Superhost' })} / سوبر هوست`}
                    size="small"
                    sx={{
                      mb: 1,
                      bgcolor: '#FF385C',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  />
                )}
                <Chip
                  icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                  label={
                    agent?.responseRate != null
                      ? `${agent.responseRate}% ${t('booking.responseRate', { defaultValue: 'response rate' })}${
                          agent.responseTime ? ` · ${agent.responseTime}` : ''
                        }`
                      : 'Responds within 2 hours'
                  }
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
                  {!isOwnListing && (
                    <Button
                      startIcon={<ChatIcon />}
                      fullWidth
                      variant="contained"
                      size="small"
                      onClick={handleMessageAgent}
                    >
                      {t('nav.messages')}
                    </Button>
                  )}
                </Stack>
              </Paper>

              {/* Inquiry form (or own-listing edit CTA) */}
              <Paper
                sx={{
                  p: 3,
                  borderInlineStart: 4,
                  borderColor: 'primary.main',
                  boxShadow: '0 6px 20px rgba(108,99,166,0.10)',
                }}
              >
                {isOwnListing ? (
                  <Stack spacing={2} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('listing.ownListingNotice')}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        void navigate({ to: `/dashboard/listings/${listing.id}/edit` as never })
                      }
                    >
                      {t('listing.editListing')}
                    </Button>
                  </Stack>
                ) : inqSuccess ? (
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
                      {t('listing.inquirySent')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('listing.inquirySentBody')}
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
                        {t('listing.sendAnotherInquiry')}
                      </Button>
                    </Stack>
                  </Stack>
                ) : ((listing as unknown as { bookingType?: string }).bookingType === 'daily'
                  || (listing as unknown as { bookingType?: string }).bookingType === 'short_term') ? (
                  <BookingCalendar
                    listingId={listing.id}
                    dailyRate={
                      Number(
                        (listing as unknown as { dailyRate?: number }).dailyRate,
                      ) || Number(listing.price)
                    }
                    weeklyRate={
                      (listing as unknown as { weeklyRate?: number | null }).weeklyRate ?? null
                    }
                    minimumStay={
                      (listing as unknown as { minimumStay?: number }).minimumStay ?? 1
                    }
                    maxGuests={
                      (listing as unknown as { maxGuests?: number | null }).maxGuests ?? null
                    }
                    damageDeposit={
                      (listing as unknown as { damageDeposit?: number | null }).damageDeposit ?? null
                    }
                    currencyLabel={String(listing.currency || t('listing.currency'))}
                  />
                ) : (
                  <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  {t('listing.contactAgent')}
                </Typography>
                {!isAuthenticated && (
                  <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                    <TextField size="small" label={t('contact.name')} value={inqName} onChange={(e) => setInqName(e.target.value)} />
                    <TextField size="small" type="email" label={t('auth.email')} value={inqEmail} onChange={(e) => setInqEmail(e.target.value)} />
                    <TextField size="small" label={t('auth.phone')} value={inqPhone} onChange={(e) => setInqPhone(e.target.value)} placeholder="+9665XXXXXXXX" />
                  </Stack>
                )}
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  size="small"
                  placeholder={`${t('listing.interestedIn')} ${listing.referenceCode}…`}
                  value={inqMessage}
                  onChange={(e) => setInqMessage(e.target.value)}
                  sx={{ mb: 2 }}
                />
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
                      color: 'common.white',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                      },
                    }}
                  >
                    {inquiryMutation.isPending ? t('common.loading') : t('listing.sendInquiry')}
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

      {/* Mobile bottom CTA sheet — buyers only */}
      {!isDesktop && !isOwnListing && (
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
            <Button fullWidth variant="contained" startIcon={<ChatIcon />} onClick={handleMessageAgent}>{t('nav.messages')}</Button>
            <Button fullWidth variant="outlined" color="success" startIcon={<WhatsAppIcon />} href={whatsappLink}>
              {t('listing.whatsapp')}
            </Button>
          </Stack>
        </Box>
      )}

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

      <EjarContractDialog
        open={ejarOpen}
        onClose={() => setEjarOpen(false)}
        listingId={id}
        defaultMonthlyRent={
          listing.rentPeriod === 'monthly'
            ? Number(listing.price)
            : Math.round(Number(listing.price) / 12)
        }
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

function PriceTrendSparkline({ city, type }: { city: string; type: string }) {
  const { t, i18n } = useTranslation();
  const trendsQuery = useQuery({
    queryKey: ['priceTrends', 'sparkline', city, type],
    queryFn: () => priceTrendsApi.trends(city, type),
    enabled: Boolean(city && type),
    staleTime: 1000 * 60 * 30,
  });
  const data = trendsQuery.data ?? [];
  if (trendsQuery.isLoading || data.length === 0) return null;

  const last = data[data.length - 1]?.avgPricePerSqm ?? 0;
  const first = data[0]?.avgPricePerSqm ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const positive = change >= 0;

  return (
    <Paper sx={{ p: 2.5, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
          {t('market.miniTrend')}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mt: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {Math.round(last).toLocaleString(i18n.language)} {t('listing.currency')}/m²
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: positive ? 'success.main' : 'error.main' }}
          >
            {positive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </Typography>
        </Stack>
        <Link to="/market" style={{ textDecoration: 'none' }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {t('market.viewMarket')} →
          </Typography>
        </Link>
      </Box>
      <Box sx={{ width: 200, height: 64 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <RechartsTooltip
              formatter={(v: number) => [`${Math.round(v).toLocaleString(i18n.language)} SAR/m²`, '']}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="avgPricePerSqm"
              stroke={positive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

// Keep this in sync with SearchPage's MAP_LIBRARIES — the Google Maps JS
// loader is a singleton, so the first page to load wins; aligning the lists
// avoids "drawing/geometry not loaded" silent failures on /search.
const MAP_LIBRARIES: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

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

// ------------------------------------------------------------------
// Short-term / hotel info panels — surfaced under the description when the
// listing carries any of the Airbnb-style or hotel metadata.
// ------------------------------------------------------------------

const SHORT_TERM_AMENITY_LABELS: Record<string, { label: string; emoji: string }> = {
  wifi: { label: 'Wi-Fi', emoji: '📶' },
  pool: { label: 'Pool', emoji: '🏊' },
  parking: { label: 'Parking', emoji: '🚗' },
  breakfast: { label: 'Breakfast', emoji: '🍳' },
  ac: { label: 'Air conditioning', emoji: '❄️' },
  kitchen: { label: 'Kitchen', emoji: '🍽️' },
  tv: { label: 'TV', emoji: '📺' },
  washer: { label: 'Washer', emoji: '🧺' },
  workspace: { label: 'Workspace', emoji: '💻' },
  petsAllowed: { label: 'Pets allowed', emoji: '🐾' },
  smokingAllowed: { label: 'Smoking allowed', emoji: '🚬' },
  wheelchairAccessible: { label: 'Wheelchair accessible', emoji: '♿' },
};

const CANCELLATION_LABELS: Record<string, string> = {
  flexible: 'Flexible — full refund up to 24 hours before check-in',
  moderate: 'Moderate — full refund up to 5 days before check-in',
  strict: 'Strict — 50% refund up to 7 days before check-in',
};

function ShortTermInfoSections({ listing }: { listing: unknown }) {
  const l = listing as {
    bookingType?: string;
    maxGuests?: number | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    houseRules?: string | null;
    amenitiesDetailed?: Record<string, boolean> | null;
    cancellationPolicy?: string | null;
    hotelStarRating?: number | null;
    hotelName?: string | null;
    propertyType?: string;
  };
  const isShortTerm = l.bookingType === 'short_term' || l.bookingType === 'daily';
  const isHotel =
    l.propertyType === 'hotel_room' || l.propertyType === 'hotel_apartment';
  if (!isShortTerm && !isHotel) return null;

  const amenities = l.amenitiesDetailed
    ? Object.entries(l.amenitiesDetailed).filter(([, v]) => v === true)
    : [];

  return (
    <Box sx={{ mb: 4 }}>
      {isHotel && (l.hotelName || l.hotelStarRating) && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="overline" color="text.secondary">Hotel</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {l.hotelName ?? '—'}
            </Typography>
            {l.hotelStarRating ? (
              <Box sx={{ color: '#D4A843', letterSpacing: 1 }}>
                {'★'.repeat(l.hotelStarRating)}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  {l.hotelStarRating}-star
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Stay details</Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap" rowGap={1.5}>
          {l.maxGuests ? (
            <InfoChip label="Max guests" value={String(l.maxGuests)} />
          ) : null}
          {l.checkInTime ? (
            <InfoChip label="Check-in" value={`from ${l.checkInTime}`} />
          ) : null}
          {l.checkOutTime ? (
            <InfoChip label="Check-out" value={`by ${l.checkOutTime}`} />
          ) : null}
          {l.cancellationPolicy ? (
            <InfoChip label="Cancellation" value={l.cancellationPolicy} />
          ) : null}
        </Stack>
        {l.cancellationPolicy && CANCELLATION_LABELS[l.cancellationPolicy] && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {CANCELLATION_LABELS[l.cancellationPolicy]}
          </Typography>
        )}
      </Paper>

      {amenities.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>What this place offers</Typography>
          <Stack direction="row" flexWrap="wrap" rowGap={1} columnGap={2}>
            {amenities.map(([key]) => {
              const meta = SHORT_TERM_AMENITY_LABELS[key] ?? { label: key, emoji: '✓' };
              return (
                <Stack key={key} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 160 }}>
                  <Typography variant="body1">{meta.emoji}</Typography>
                  <Typography variant="body2">{meta.label}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}

      {l.houseRules && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>House rules</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {l.houseRules}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
        {value}
      </Typography>
    </Box>
  );
}

// ------------------------------------------------------------------
// Listing reviews section — sub-rating averages + recent comments.
// ------------------------------------------------------------------

function ListingReviewsSection({ listingId }: { listingId: string }) {
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: () => reviewsApi.forListing(listingId, 1, 6),
    staleTime: 60_000,
  });
  if (reviewsQuery.isLoading) return null;
  const data = reviewsQuery.data;
  if (!data || data.totalReviews === 0) return null;

  const sub = data.subRatings;
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        ⭐ {data.averageRating.toFixed(1)} · {data.totalReviews} reviews
      </Typography>

      {sub && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <SubRatingRow emoji="🧹" label="Cleanliness" value={sub.cleanliness} />
          <SubRatingRow emoji="✅" label="Accuracy" value={sub.accuracy} />
          <SubRatingRow emoji="💬" label="Communication" value={sub.communication} />
          <SubRatingRow emoji="📍" label="Location" value={sub.location} />
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        {data.reviews.map((r) => (
          <Paper key={r.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Box sx={{ color: '#D4A843', letterSpacing: 1 }}>{'★'.repeat(r.rating)}</Box>
              <Typography variant="caption" color="text.secondary">
                {r.reviewer
                  ? `${r.reviewer.firstName} ${r.reviewer.lastName}`.trim()
                  : 'Guest'}{' '}
                · {new Date(r.createdAt).toLocaleDateString()}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {r.comment}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

function SubRatingRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number | null;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography variant="h6" sx={{ width: 28 }}>{emoji}</Typography>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {value != null ? value.toFixed(1) : '—'}
        </Typography>
      </Box>
    </Stack>
  );
}
