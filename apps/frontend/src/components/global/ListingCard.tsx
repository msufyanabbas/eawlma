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
import { useAuthStore } from '@/store/auth.store';
import { useTranslation } from 'react-i18next';
import { ListingType, type Listing } from '@eawlma/shared-types';
import { type MouseEvent } from 'react';
import { listingCoverUrl } from '@/utils/listingImages';
import { getListingTitle, getListingLocation } from '@/utils/listingText';
import { whatsappListingUrl } from '@/utils/whatsapp';
import { formatNumber, formatPrice } from '@/utils/formatters';
import { SaveToWishlistButton } from '@/components/global/SaveToWishlistButton';

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
  /** @deprecated Compact dimensions are now the default. Accepted for backward
   *  compatibility with existing call sites. */
  compact?: boolean;
}


export function ListingCard({ listing, locale, saved, onToggleSave, agentVerified }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  // Imperative navigation — works without TanStack Router code-gen and avoids
  // the typed-Link `params` issue. The string interpolation is matched against
  // the registered '/listings/$id' route at runtime.
  // The handler also guards against bubbled clicks from inner buttons / links
  // (heart, WhatsApp share, compare) so those don't accidentally navigate.
  // Inner action buttons (save, compare, WhatsApp) sit inside this same card
  // and must NOT navigate when clicked. We mark each with `data-action` and
  // bail out of navigation if the click originated inside one — same for any
  // <button> or <a>. After that, fall through to a hard-page navigation; the
  // search page's frequent re-renders were swallowing TanStack Router calls.
  const goToDetail = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action]')) return;
      if (target?.closest('button')) return;
      if (target?.closest('a')) return;
    }
    window.location.href = `/listings/${listing.id}`;
  };
  const activeLocale = locale ?? i18n.language;
  const title = getListingTitle(listing, activeLocale);
  // Route the address line through the active locale so the city (and any
  // region) reads in the same language as the rest of the card.
  const location = getListingLocation(listing, activeLocale);
  const coverUrl = listingCoverUrl(listing);
  // The wire-shape Listing carries only `ownerId`. Until the backend bundles
  // a denormalised `agent.fullName`, fall back to a clean "Verified Agent"
  // label rather than rendering UUID-character noise like "7" or "F".
  const agentName = (listing as unknown as { agent?: { fullName?: string } }).agent?.fullName;
  const agentDisplay = agentName?.trim() || t('listing.verifiedAgent');
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

  // Every action button inside the card stops both the click and the default
  // so they never bubble up to the card-root navigate handler.
  const handleSaveClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleSave?.(listing.id);
  };

  // Authenticated users get the multi-list "Save to wishlist" popover; anonymous
  // users still use the legacy single-heart toggle so they can pin listings
  // without an account.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const compareHas = useCompareStore((s) => s.has(listing.id));
  const toggleCompare = useCompareStore((s) => s.toggle);
  const handleCompareClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleCompare(listing.id);
  };

  const handleWhatsAppShare = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // No agent phone on the card payload — keep the share-mode wa.me link
    // (empty phone routes the user to pick a contact). Listing context still
    // gets formatted through the central helper for consistency.
    const url = whatsappListingUrl('', listing, {
      locale: activeLocale,
      absoluteUrl: `${window.location.origin}/listings/${listing.id}`,
    });
    window.open(
      url || `https://wa.me/?text=${encodeURIComponent(`Check this property: ${title}`)}`,
      '_blank',
      'noopener',
    );
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        minHeight: 340,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
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
        {/* Cover — 200px gives the photo enough room to breathe without
         *  dominating the card. */}
        <Box sx={{ position: 'relative', height: 200, bgcolor: 'grey.100' }}>
          <Box
            component="img"
            src={coverUrl}
            alt={title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />

          {/* Top inline-start: status chips wrap so they never collide with
           *  the action column on the inline-end side. maxWidth caps growth on
           *  narrow cards. Logical properties so the cluster flips in RTL. */}
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              insetInlineStart: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              maxWidth: 'calc(100% - 64px)',
            }}
          >
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
          </Box>

          {/* Top inline-end: stacked column of action icons so they don't
           *  crowd the status chips even when all three appear. */}
          <Stack direction="column" spacing={0.5} sx={{ position: 'absolute', top: 8, insetInlineEnd: 8 }}>
            <Tooltip
              title={
                compareHas
                  ? t('compare.remove', { defaultValue: 'Remove from compare' })
                  : t('compare.add', { defaultValue: 'Add to compare' })
              }
            >
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
            <Tooltip title={t('listing.whatsapp')}>
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
            {isAuthenticated ? (
              <SaveToWishlistButton listingId={listing.id} />
            ) : (
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
            )}
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
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2 }}>
              {formatPrice(Number(listing.price), activeLocale)}
              <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.92 }}>
                {t('listing.currency')}
                {!isSale && listing.rentPeriod ? rentSuffix(t, listing.rentPeriod) : ''}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Body — generous padding so price + title + features each get a
         *  comfortable row without crowding. */}
        <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
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
              {t(`propertyTypes.${String(listing.propertyType).toLowerCase()}`, {
                defaultValue: String(listing.propertyType),
              })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {listing.referenceCode}
            </Typography>
          </Stack>

          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
              mt: 0.75,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, mb: 0.5, color: 'text.secondary' }}>
            <PlaceIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">{location}</Typography>
          </Stack>
          {pricePerSqm && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
              {formatPrice(pricePerSqm, activeLocale)} {t('listing.currency')}/{t('listing.sqm')}
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
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {formatNumber(listing.bedrooms, activeLocale)}
                </Typography>
              </Stack>
            )}
            {listing.bathrooms !== null && listing.bathrooms !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BathIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {formatNumber(listing.bathrooms, activeLocale)}
                </Typography>
              </Stack>
            )}
            {listing.area !== null && listing.area !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AreaIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {formatNumber(Number(listing.area), activeLocale)} {t('listing.areaUnit')}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Box>

      {/* Footer: agent strip — solid top border, with inline WhatsApp button */}
      {showVerified && (
        <Box
          sx={{
            px: 2,
            pb: 1.25,
            pt: 1.25,
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 'auto',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Avatar
              sx={{
                width: 22,
                height: 22,
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
            <Tooltip title={t('listing.verified', { defaultValue: 'Verified' })}>
              <VerifiedIcon sx={{ fontSize: 16, color: theme.eawlma.accent }} />
            </Tooltip>
            <Tooltip title={t('listing.whatsapp')}>
              <IconButton
                onClick={handleWhatsAppShare}
                size="small"
                aria-label="contact via whatsapp"
                sx={{
                  width: 26,
                  height: 26,
                  bgcolor: '#25D366',
                  color: 'common.white',
                  '&:hover': { bgcolor: '#1ebe57' },
                }}
              >
                <WhatsAppIcon sx={{ fontSize: 15 }} />
              </IconButton>
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
