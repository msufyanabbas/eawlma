import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import BedIcon from '@mui/icons-material/KingBedOutlined';
import BathIcon from '@mui/icons-material/BathtubOutlined';
import AreaIcon from '@mui/icons-material/SquareFootOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useCompareStore } from '@/store/compare.store';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ListingType, type Listing } from '@eawlma/shared-types';
import { type MouseEvent } from 'react';
import { listingCoverUrl } from '@/utils/listingImages';
import { getListingTitle, getListingLocation } from '@/utils/listingText';

interface ListingCardProps {
  listing: Listing;
  /** Active locale for translation lookup; defaults to current i18n language. */
  locale?: string;
  /** When provided, the heart icon reflects this state instead of reading the store directly. */
  saved?: boolean;
  /** Receives the listing id when toggled. Promise return is awaited for optimistic-UI rollback. */
  onToggleSave?: (listingId: string) => void | Promise<void>;
  /** Pass `true` to surface the verified-agent badge on the agent strip. */
  agentVerified?: boolean;
}


export function ListingCard({ listing, locale, saved, onToggleSave, agentVerified }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  // Imperative navigation — works without TanStack Router code-gen and avoids
  // the typed-Link `params` issue. The string interpolation is matched against
  // the registered '/listings/$id' route at runtime.
  // The handler also guards against bubbled clicks from inner buttons / links
  // (heart, WhatsApp share, compare) so those don't accidentally navigate.
  const goToDetail = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, [role="button"]:not([data-card-root])')) {
        return;
      }
    }
    void navigate({ to: `/listings/${listing.id}` as never });
  };
  const activeLocale = locale ?? i18n.language;
  const title = getListingTitle(listing, activeLocale);
  const location = getListingLocation(listing);
  const coverUrl = listingCoverUrl(listing);
  // The wire-shape Listing carries only `ownerId`. Until the backend bundles
  // a denormalised `agent.fullName`, fall back to a clean "Verified Agent"
  // label rather than rendering UUID-character noise like "7" or "F".
  const agentName = (listing as unknown as { agent?: { fullName?: string } }).agent?.fullName;
  const agentDisplay = agentName?.trim() || 'Verified Agent';
  const agentInitials = (agentName?.trim()?.[0] ?? 'A').toUpperCase();
  const isSale = listing.type === ListingType.SALE;
  // Featured listings come from owners who already passed the publish gate, so
  // we treat them as verified by default unless the parent overrides.
  const showVerified = agentVerified ?? listing.isFeatured;

  // "New" badge if published within the last 7 days.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const publishedAt = listing.publishedAt ? new Date(listing.publishedAt).getTime() : 0;
  const isNew = publishedAt > 0 && Date.now() - publishedAt < SEVEN_DAYS_MS;

  // Price per square metre (sale only — rent uses /period instead).
  const pricePerSqm =
    isSale && listing.area && Number(listing.area) > 0
      ? Math.round(Number(listing.price) / Number(listing.area))
      : null;

  const handleSaveClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.(listing.id);
  };

  const compareHas = useCompareStore((s) => s.has(listing.id));
  const toggleCompare = useCompareStore((s) => s.toggle);
  const handleCompareClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(listing.id);
  };

  const handleWhatsAppShare = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.id}`;
    const text = `Check this property: ${title} — ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        minHeight: 380,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: 'divider',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(108,99,166,0.08)',
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: alpha(theme.palette.primary.main, 0.4),
          boxShadow: '0 12px 32px rgba(108,99,166,0.18)',
        },
      }}
    >
      <Box
        data-card-root
        onClick={goToDetail}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToDetail(e);
          }
        }}
        sx={{ flex: 1, cursor: 'pointer', outline: 'none' }}
      >
        {/* Cover — 200px tall (matches the section spec) */}
        <Box sx={{ position: 'relative', height: 200, bgcolor: 'grey.100' }}>
          <Box
            component="img"
            src={coverUrl}
            alt={title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />

          {/* Top-left: type + (gold) featured chip + green New chip */}
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, insetInlineStart: 10 }}>
            <Chip
              size="small"
              variant="filled"
              label={isSale ? t('listing.forSale') : t('listing.forRent')}
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: 11,
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'text.primary',
                border: 'none',
              }}
            />
            {isNew && (
              <Chip
                size="small"
                label={t('listing.new', { defaultValue: 'New' })}
                sx={{
                  height: 24,
                  fontWeight: 700,
                  fontSize: 11,
                  bgcolor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                }}
              />
            )}
            {listing.isFeatured && (
              <Chip
                size="small"
                icon={<StarIcon sx={{ fontSize: 13, color: '#1A1A2E !important' }} />}
                label={t('listing.featured')}
                sx={{
                  height: 24,
                  fontWeight: 700,
                  fontSize: 11,
                  bgcolor: theme.eawlma.gold,
                  color: '#1A1A2E',
                  border: 'none',
                  '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                }}
              />
            )}
          </Stack>

          {/* Top-right: compare + favorite + WhatsApp share */}
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, insetInlineEnd: 8 }}>
            <Tooltip title={compareHas ? 'Remove from compare' : 'Add to compare'}>
              <IconButton
                onClick={handleCompareClick}
                size="small"
                sx={{
                  bgcolor: compareHas ? 'primary.main' : 'rgba(255,255,255,0.95)',
                  color: compareHas ? 'common.white' : 'primary.dark',
                  '&:hover': { bgcolor: compareHas ? 'primary.dark' : 'common.white' },
                }}
                aria-label="add to compare"
              >
                <CompareArrowsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on WhatsApp">
              <IconButton
                onClick={handleWhatsAppShare}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.95)',
                  color: '#25D366',
                  '&:hover': { bgcolor: 'common.white' },
                }}
                aria-label="share on whatsapp"
              >
                <WhatsAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={saved ? t('listing.saved') : t('listing.save')}>
              <IconButton
                onClick={handleSaveClick}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.95)',
                  '&:hover': { bgcolor: 'common.white' },
                }}
                aria-label="save listing"
              >
                {saved ? (
                  <FavoriteIcon fontSize="small" color="error" />
                ) : (
                  <FavoriteBorderIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Bottom-left: lavender price badge */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              insetInlineStart: 10,
              background: theme.eawlma.gradient,
              color: 'common.white',
              px: 1.5,
              py: 0.6,
              borderRadius: 999,
              boxShadow: '0 6px 14px rgba(74,64,128,0.35)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {Number(listing.price).toLocaleString(activeLocale)}
              <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.92 }}>
                {t('listing.currency')}
                {!isSale && listing.rentPeriod ? rentSuffix(t, listing.rentPeriod) : ''}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Body — tighter padding for compactness */}
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'primary.dark',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {t(`listing.${listing.propertyType}`, { defaultValue: listing.propertyType })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {listing.referenceCode}
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontSize: '1.1rem',
              fontWeight: 700,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
              mt: 1.5,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, mb: 0.5, color: 'text.secondary' }}>
            <PlaceIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: '0.875rem' }}>
              {location}
            </Typography>
          </Stack>
          {pricePerSqm && (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1 }}>
              {pricePerSqm.toLocaleString(activeLocale)} {t('listing.currency')}/m²
            </Typography>
          )}

          {/* Feature row — bigger gap + 0.875rem typography */}
          <Stack
            direction="row"
            spacing={2}
            divider={
              <Box sx={{ width: '1px', height: 14, bgcolor: 'divider', alignSelf: 'center' }} />
            }
            sx={{ color: 'text.primary' }}
          >
            {listing.bedrooms !== null && listing.bedrooms !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {listing.bedrooms}
                </Typography>
              </Stack>
            )}
            {listing.bathrooms !== null && listing.bathrooms !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BathIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {listing.bathrooms}
                </Typography>
              </Stack>
            )}
            {listing.area !== null && listing.area !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AreaIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {Number(listing.area).toLocaleString(activeLocale)} {t('listing.areaUnit')}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Box>

      {/* Footer: agent strip — solid top border, larger spacing */}
      {showVerified && (
        <Box
          sx={{
            px: 1.75,
            pb: 1.5,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: 11,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.dark',
                fontWeight: 700,
              }}
            >
              {agentInitials}
            </Avatar>
            <Typography
              variant="caption"
              color="text.primary"
              sx={{ flex: 1, fontWeight: 600 }}
              noWrap
            >
              {agentDisplay}
            </Typography>
            <Tooltip title={t('listing.featured')}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.4}
                sx={{
                  bgcolor: alpha(theme.eawlma.accent, 0.14),
                  color: theme.eawlma.accent,
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 999,
                }}
              >
                <VerifiedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10.5 }}>
                  {t('listing.verified', { defaultValue: 'Verified' })}
                </Typography>
              </Stack>
            </Tooltip>
          </Stack>
        </Box>
      )}
    </Card>
  );
}

// Maps RentPeriod -> i18n suffix key. Listings can be priced daily, weekly,
// monthly, quarterly, or yearly; we only show the most common units in the
// price chip and fall back to the raw period for the long-tail.
type TFn = (key: string) => string;
function rentSuffix(t: TFn, period: string): string {
  switch (period) {
    case 'monthly':
      return t('listing.perMonth');
    case 'yearly':
      return t('listing.perYear');
    case 'daily':
      return t('listing.perDay');
    default:
      return ` /${period}`;
  }
}
