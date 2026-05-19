import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { Listing } from '@eawlma/shared-types';

import { listingsApi } from '@/api/listings.api';
import { EmptyState } from '@/components/global/EmptyState';
import { useCompareStore } from '@/store/compare.store';
import { listingCoverUrl } from '@/utils/listingImages';
import { getListingTitle, getListingLocation } from '@/utils/listingText';

interface CompareRow {
  key: string;
  label: string;
  /** Returns a printable cell value — empty strings render as a "—". */
  pick: (l: Listing) => string;
  /** When provided, returns the "best" listing id for this row.
   *  The cell for that id is highlighted with a lavender background. */
  best?: (rows: Listing[]) => string | null;
}

const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : Number(n).toLocaleString();

export function ComparePage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['listings', id],
      queryFn: () => listingsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const listings = useMemo(
    () => queries.map((q) => q.data).filter((l): l is Listing => Boolean(l)),
    [queries],
  );

  const rows: CompareRow[] = [
    {
      key: 'price',
      label: 'Price',
      pick: (l) => `${Number(l.price).toLocaleString(i18n.language)} ${l.currency}`,
      best: (xs) => {
        if (xs.length === 0) return null;
        return xs.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b)).id;
      },
    },
    {
      key: 'type',
      label: 'Type',
      pick: (l) => t(`listing.${l.type}`, { defaultValue: l.type }),
    },
    {
      key: 'propertyType',
      label: 'Property',
      pick: (l) => t(`listing.${l.propertyType}`, { defaultValue: l.propertyType }),
    },
    {
      key: 'area',
      label: `Area (${t('listing.areaUnit')})`,
      pick: (l) => fmtNum(l.area),
      best: (xs) => {
        const withArea = xs.filter((x) => x.area !== null && x.area !== undefined);
        if (withArea.length === 0) return null;
        return withArea.reduce((a, b) => (Number(a.area) >= Number(b.area) ? a : b)).id;
      },
    },
    {
      key: 'bedrooms',
      label: 'Bedrooms',
      pick: (l) => fmtNum(l.bedrooms),
      best: (xs) => {
        const arr = xs.filter((x) => x.bedrooms !== null && x.bedrooms !== undefined);
        if (arr.length === 0) return null;
        return arr.reduce((a, b) => ((a.bedrooms ?? 0) >= (b.bedrooms ?? 0) ? a : b)).id;
      },
    },
    {
      key: 'bathrooms',
      label: 'Bathrooms',
      pick: (l) => fmtNum(l.bathrooms),
      best: (xs) => {
        const arr = xs.filter((x) => x.bathrooms !== null && x.bathrooms !== undefined);
        if (arr.length === 0) return null;
        return arr.reduce((a, b) => ((a.bathrooms ?? 0) >= (b.bathrooms ?? 0) ? a : b)).id;
      },
    },
    {
      key: 'floor',
      label: 'Floor',
      pick: (l) => fmtNum(l.floorNumber),
    },
    {
      key: 'parking',
      label: 'Parking',
      pick: (l) => fmtNum(l.parkingSpaces),
      best: (xs) => {
        const arr = xs.filter((x) => x.parkingSpaces !== null && x.parkingSpaces !== undefined);
        if (arr.length === 0) return null;
        return arr.reduce((a, b) => ((a.parkingSpaces ?? 0) >= (b.parkingSpaces ?? 0) ? a : b)).id;
      },
    },
    {
      key: 'amenities',
      label: 'Amenities',
      pick: (l) => {
        const tags: string[] = [];
        if (l.hasPool) tags.push('Pool');
        if (l.hasGym) tags.push('Gym');
        if (l.hasGarden) tags.push('Garden');
        if (l.hasElevator) tags.push('Elevator');
        if (l.hasSecurity) tags.push('Security');
        if (l.hasCentralAC) tags.push('AC');
        return tags.join(' · ');
      },
    },
    {
      key: 'location',
      label: 'Location',
      pick: (l) => getListingLocation(l),
    },
    {
      key: 'agent',
      label: 'Agent',
      pick: (l) => l.ownerId.slice(0, 8),
    },
  ];

  return (
    <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 4, md: 6 } }}>
      <Helmet>
        <title>{t('listingDetailPage.helmetTitle')} — {t('app.name')}</title>
      </Helmet>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Compare listings
        </Typography>
        {listings.length > 0 && (
          <Button onClick={clear} variant="outlined">
            Clear all
          </Button>
        )}
      </Stack>

      {listings.length === 0 ? (
        <EmptyState
          title={t('comparePage.emptyTitle')}
          description={t('comparePage.emptyDesc', 'Add up to 3 listings from the search results to compare them side by side.')}
          ctaLabel={t('comparePage.browse', 'Browse listings')}
          onCta={() => void navigate({ to: '/search' as never })}
        />
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(${listings.length}, minmax(220px, 1fr))`,
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            {/* ---- Header row: empty corner + listing cards ---- */}
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), borderBottom: 1, borderColor: 'divider' }} />
            {listings.map((l) => (
              <Box
                key={l.id}
                sx={{
                  position: 'relative',
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderBottom: 1,
                  borderColor: 'divider',
                  borderInlineStart: 1,
                  borderInlineStartColor: 'divider',
                }}
              >
                <IconButton
                  onClick={() => remove(l.id)}
                  size="small"
                  sx={{ position: 'absolute', top: 6, insetInlineEnd: 6 }}
                  aria-label="remove from compare"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Box
                  component={Link}
                  to={'/listings/$id' as never}
                  params={{ id: l.id } as never}
                  sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <Box
                    component="img"
                    src={listingCoverUrl(l)}
                    alt={l.referenceCode}
                    sx={{
                      width: '100%',
                      height: 140,
                      objectFit: 'cover',
                      borderRadius: 2,
                      mb: 1.5,
                      display: 'block',
                    }}
                  />
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
                    {getListingTitle(l, i18n.language)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.referenceCode}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  sx={{ mt: 1.5, background: theme.eawlma.gradient, fontWeight: 700 }}
                  component={Link}
                  to={'/listings/$id' as never}
                  params={{ id: l.id } as never}
                >
                  Inquire
                </Button>
              </Box>
            ))}

            {/* ---- Body rows ---- */}
            {rows.map((row) => {
              const bestId = row.best ? row.best(listings) : null;
              return (
                <Box key={row.key} sx={{ display: 'contents' }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      borderBottom: 1,
                      borderColor: 'divider',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                    }}
                  >
                    {row.label}
                  </Box>
                  {listings.map((l) => {
                    const isBest = bestId === l.id;
                    const value = row.pick(l) || '—';
                    return (
                      <Box
                        key={l.id}
                        sx={{
                          p: 2,
                          borderInlineStart: 1,
                          borderInlineStartColor: 'divider',
                          borderBottom: 1,
                          borderColor: 'divider',
                          bgcolor: isBest ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                          color: isBest ? 'primary.dark' : 'text.primary',
                          fontWeight: isBest ? 700 : 500,
                          fontSize: '0.95rem',
                        }}
                      >
                        {value}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Container>
  );
}
