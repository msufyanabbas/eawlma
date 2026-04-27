import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import BedIcon from '@mui/icons-material/KingBedOutlined';
import BathIcon from '@mui/icons-material/BathtubOutlined';
import AreaIcon from '@mui/icons-material/SquareFootOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ListingType, type Listing } from '@aqarat/shared-types';
import { type MouseEvent } from 'react';

interface ListingCardProps {
  listing: Listing;
  /** Active locale for translation lookup; defaults to current i18n language. */
  locale?: string;
  saved?: boolean;
  onToggleSave?: (listingId: string) => void;
}

/** Picks the best title/description for the active locale, with fallbacks. */
function localized(listing: Listing, locale: string) {
  const tr = listing.translations?.find((t) => t.locale === locale);
  return {
    title: tr?.title ?? listing.title,
    description: tr?.description ?? listing.description,
  };
}

export function ListingCard({ listing, locale, saved, onToggleSave }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const activeLocale = locale ?? i18n.language;
  const { title } = localized(listing, activeLocale);
  const cover = listing.media?.[0];
  const agentInitials = `${listing.ownerId.slice(0, 1).toUpperCase()}`;
  const isSale = listing.type === ListingType.SALE;

  const handleSaveClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.(listing.id);
  };

  return (
    <Card sx={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea component={Link} to={`/listings/${listing.id}` as never} sx={{ flex: 1 }}>
        {/* Cover */}
        <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: 'grey.100' }}>
          {cover ? (
            <Box
              component="img"
              src={cover.thumbnailUrl ?? cover.url}
              alt={title}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="caption">{t('empty.noListings')}</Typography>
            </Box>
          )}

          {/* Top-left: type chip */}
          <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 12, insetInlineStart: 12 }}>
            <Chip
              size="small"
              variant="filled"
              color={isSale ? 'primary' : 'success'}
              label={isSale ? t('listing.forSale') : t('listing.forRent')}
              sx={{ fontWeight: 700 }}
            />
            {listing.isFeatured && (
              <Chip
                size="small"
                color="secondary"
                icon={<StarIcon sx={{ fontSize: 14 }} />}
                label={t('listing.featured')}
              />
            )}
          </Stack>

          {/* Top-right: favorite */}
          <Box sx={{ position: 'absolute', top: 8, insetInlineEnd: 8 }}>
            <Tooltip title={saved ? t('listing.saved') : t('listing.save')}>
              <IconButton
                onClick={handleSaveClick}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.92)',
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
          </Box>

          {/* Bottom-left: price badge */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              insetInlineStart: 12,
              bgcolor: 'rgba(15,23,42,0.85)',
              color: 'common.white',
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {Number(listing.price).toLocaleString(activeLocale)}
              <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
                {t('listing.currency')}
                {!isSale && listing.rentPeriod ? rentSuffix(t, listing.rentPeriod) : ''}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <CardContent sx={{ pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
            <Chip
              variant="outlined"
              size="small"
              label={t(`listing.${listing.propertyType}`, { defaultValue: listing.propertyType })}
              sx={{ height: 22, fontSize: 11 }}
            />
            <Typography variant="caption" color="text.secondary">
              · {listing.referenceCode}
            </Typography>
          </Stack>

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.7em',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {listing.district ? `${listing.district}, ` : ''}
            {listing.city}
          </Typography>

          {/* Feature row */}
          <Stack direction="row" spacing={2.5} sx={{ color: 'text.secondary' }}>
            {listing.bedrooms !== null && listing.bedrooms !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BedIcon fontSize="small" />
                <Typography variant="body2">{listing.bedrooms}</Typography>
              </Stack>
            )}
            {listing.bathrooms !== null && listing.bathrooms !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BathIcon fontSize="small" />
                <Typography variant="body2">{listing.bathrooms}</Typography>
              </Stack>
            )}
            {listing.area !== null && listing.area !== undefined && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AreaIcon fontSize="small" />
                <Typography variant="body2">
                  {Number(listing.area).toLocaleString(activeLocale)} {t('listing.areaUnit')}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>

      {/* Footer: agent strip */}
      <Box sx={{ px: 2, pb: 2, pt: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{agentInitials}</Avatar>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {t('listing.agent')}
          </Typography>
          <VerifiedIcon fontSize="small" sx={{ color: 'success.main' }} />
        </Stack>
      </Box>
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
