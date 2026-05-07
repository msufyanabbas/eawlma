import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ListViewIcon from '@mui/icons-material/ViewList';
import MapViewIcon from '@mui/icons-material/Map';
import FilterIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  GoogleMap,
  InfoWindowF,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import {
  ListingType,
  PropertyType,
  type Listing,
} from '@eawlma/shared-types';
import { searchApi, type FlatSearchParams } from '@/api/search.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { Reveal } from '@/components/global/Reveal';
import { useSavedStore } from '@/store/saved.store';
import { listingCoverUrl } from '@/utils/listingImages';
import { getListingTitle, getListingLocation } from '@/utils/listingText';
import BedIcon from '@mui/icons-material/KingBedOutlined';
import BathIcon from '@mui/icons-material/BathtubOutlined';
import AreaIcon from '@mui/icons-material/SquareFootOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

type ViewMode = 'grid' | 'list' | 'map';

interface SearchPageSearch {
  q?: string;
  type?: ListingType;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyTypes?: string;
  amenities?: string;
  isFeatured?: boolean;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  view?: ViewMode;
}

const PAGE_SIZE = 12;
const PRICE_BOUNDS: [number, number] = [0, 5_000_000];
const AREA_BOUNDS: [number, number] = [0, 2000];

const AMENITY_OPTIONS = [
  { key: 'hasPool', labelKey: 'amenityPool', defaultLabel: 'Pool' },
  { key: 'hasGym', labelKey: 'amenityGym', defaultLabel: 'Gym' },
  { key: 'hasGarden', labelKey: 'amenityGarden', defaultLabel: 'Garden' },
  { key: 'hasElevator', labelKey: 'amenityElevator', defaultLabel: 'Elevator' },
  { key: 'hasSecurity', labelKey: 'amenitySecurity', defaultLabel: 'Security' },
  { key: 'hasCentralAC', labelKey: 'amenityAc', defaultLabel: 'Central AC' },
] as const;

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  // Read params straight from `window.location.search` instead of TanStack
  // Router's `useSearch` so the filter state is *not* tied to the router
  // store. Earlier we used `navigate({ to: '/search', replace: true })` to
  // push filters to the URL, which racetracked with card clicks — clicking
  // a listing fired `navigate({ to: '/listings/:id' })` while the search
  // sync effect fired right after, swallowing the navigation. By doing all
  // URL writes via `window.history.replaceState` (below) we keep the bar in
  // sync without poking the router.
  const initial = useMemo<SearchPageSearch>(() => {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    const out: SearchPageSearch = {};
    const get = (k: string): string | undefined => p.get(k) ?? undefined;
    if (get('q')) out.q = get('q');
    if (get('type')) out.type = get('type') as ListingType;
    if (get('city')) out.city = get('city');
    if (get('district')) out.district = get('district');
    if (get('minPrice')) out.minPrice = Number(get('minPrice'));
    if (get('maxPrice')) out.maxPrice = Number(get('maxPrice'));
    if (get('minArea')) out.minArea = Number(get('minArea'));
    if (get('maxArea')) out.maxArea = Number(get('maxArea'));
    if (get('minBedrooms')) out.minBedrooms = Number(get('minBedrooms'));
    if (get('minBathrooms')) out.minBathrooms = Number(get('minBathrooms'));
    if (get('propertyTypes')) out.propertyTypes = get('propertyTypes');
    if (get('amenities')) out.amenities = get('amenities');
    if (get('isFeatured') === 'true') out.isFeatured = true;
    if (get('sortField')) out.sortField = get('sortField');
    if (get('sortOrder')) out.sortOrder = get('sortOrder') as 'ASC' | 'DESC';
    if (get('view')) out.view = get('view') as ViewMode;
    return out;
    // Initial-only — re-reading on every render would fight our own writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- local filter state derived from URL --------------------------
  const [q, setQ] = useState(initial.q ?? '');
  const [type, setType] = useState<ListingType | ''>(initial.type ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [district, setDistrict] = useState(initial.district ?? '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(initial.minPrice ?? PRICE_BOUNDS[0]),
    Number(initial.maxPrice ?? PRICE_BOUNDS[1]),
  ]);
  const [areaRange, setAreaRange] = useState<[number, number]>([
    Number(initial.minArea ?? AREA_BOUNDS[0]),
    Number(initial.maxArea ?? AREA_BOUNDS[1]),
  ]);
  const [minBedrooms, setMinBedrooms] = useState<string>(
    initial.minBedrooms ? String(initial.minBedrooms) : '',
  );
  const [minBathrooms, setMinBathrooms] = useState<string>(
    initial.minBathrooms ? String(initial.minBathrooms) : '',
  );
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(initial.isFeatured));
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(
    initial.propertyTypes ? (initial.propertyTypes.split(',') as PropertyType[]) : [],
  );
  const [amenities, setAmenities] = useState<string[]>(
    initial.amenities ? initial.amenities.split(',') : [],
  );
  const [sort, setSort] = useState<string>(initial.sortField ?? 'createdAt');
  const [view, setView] = useState<ViewMode>((initial.view as ViewMode) ?? 'grid');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Push filter state back to the URL bar via `window.history.replaceState`
  // so the page stays deep-linkable, but *without* going through TanStack
  // Router's navigation pipeline. A previous version used
  // `navigate({ to: '/search', replace: true })`; that re-entered the router
  // synchronously and could swallow an in-flight click on a listing card.
  // Skipping the first effect run (initial state already matches the URL)
  // is preserved as a defensive belt-and-braces.
  const filtersHydratedRef = useRef(false);
  useEffect(() => {
    if (!filtersHydratedRef.current) {
      filtersHydratedRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (city) params.set('city', city);
    if (district) params.set('district', district);
    if (priceRange[0] > PRICE_BOUNDS[0]) params.set('minPrice', String(priceRange[0]));
    if (priceRange[1] < PRICE_BOUNDS[1]) params.set('maxPrice', String(priceRange[1]));
    if (areaRange[0] > AREA_BOUNDS[0]) params.set('minArea', String(areaRange[0]));
    if (areaRange[1] < AREA_BOUNDS[1]) params.set('maxArea', String(areaRange[1]));
    if (minBedrooms) params.set('minBedrooms', String(Number(minBedrooms)));
    if (minBathrooms) params.set('minBathrooms', String(Number(minBathrooms)));
    if (verifiedOnly) params.set('isFeatured', 'true');
    if (propertyTypes.length > 0) params.set('propertyTypes', propertyTypes.join(','));
    if (amenities.length > 0) params.set('amenities', amenities.join(','));
    if (sort !== 'createdAt') params.set('sortField', sort);
    if (view !== 'grid') params.set('view', view);

    const qs = params.toString();
    const nextUrl = `/search${qs ? `?${qs}` : ''}`;
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== nextUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [
    q, type, city, district, priceRange, areaRange,
    minBedrooms, minBathrooms, verifiedOnly, propertyTypes, amenities, sort, view,
  ]);

  // ----- query --------------------------------------------------------
  const buildParams = (page: number): FlatSearchParams => ({
    q: q || undefined,
    type: type || undefined,
    city: city || undefined,
    district: district || undefined,
    minPrice: priceRange[0] > PRICE_BOUNDS[0] ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < PRICE_BOUNDS[1] ? priceRange[1] : undefined,
    minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
    minArea: areaRange[0] > AREA_BOUNDS[0] ? areaRange[0] : undefined,
    propertyTypes: propertyTypes.length > 0 ? propertyTypes : undefined,
    isFeatured: verifiedOnly || undefined,
    sortField: sort,
    page,
    limit: PAGE_SIZE,
  });

  const queryKey = useMemo(
    () => [
      'search',
      { q, type, city, district, priceRange, areaRange, minBedrooms, minBathrooms, propertyTypes, amenities, verifiedOnly, sort },
    ],
    [q, type, city, district, priceRange, areaRange, minBedrooms, minBathrooms, propertyTypes, amenities, verifiedOnly, sort],
  );

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => searchApi.listings(buildParams(pageParam as number)),
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
  });

  const listings: Listing[] = useMemo(
    () => infiniteQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [infiniteQuery.data],
  );
  const total = infiniteQuery.data?.pages[0]?.meta.total ?? 0;

  // Infinite scroll: when the sentinel intersects the viewport, fetch next.
  const sentinelRef = (node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          void infiniteQuery.fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
  };

  const clearFilters = () => {
    setQ(''); setType(''); setCity(''); setDistrict('');
    setPriceRange(PRICE_BOUNDS); setAreaRange(AREA_BOUNDS);
    setMinBedrooms(''); setMinBathrooms('');
    setPropertyTypes([]); setAmenities([]); setVerifiedOnly(false);
  };

  const activeChips = buildActiveChips({
    q, type, city, district, priceRange, areaRange,
    minBedrooms, minBathrooms, propertyTypes, amenities, verifiedOnly,
  });

  // --- shared filter panel props ---
  const filterPanelProps = {
    type, setType,
    propertyTypes, setPropertyTypes,
    priceRange, setPriceRange,
    areaRange, setAreaRange,
    minBedrooms, setMinBedrooms,
    minBathrooms, setMinBathrooms,
    amenities, setAmenities,
    verifiedOnly, setVerifiedOnly,
    city, setCity,
    district, setDistrict,
  };

  return (
    <Box sx={{ bgcolor: 'background.default', width: '100%', minHeight: 'calc(100vh - 72px)' }}>
      <Helmet>
        <title>{t('nav.search')} — {t('app.name')}</title>
      </Helmet>

      {/* ============ Mobile filters trigger (no duplicate search bar — navbar handles search) ============ */}
      {!isDesktop && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            py: 1.5,
            px: { xs: 3, sm: 4 },
            position: 'sticky',
            top: 64,
            zIndex: 10,
          }}
        >
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setFilterDrawerOpen(true)}
            variant="outlined"
            size="small"
            fullWidth
          >
            {t('search.filters')}
            {activeChips.length > 0 && (
              <Box
                sx={{
                  ml: 1, minWidth: 20, height: 20, px: 0.75,
                  borderRadius: 999, bgcolor: 'primary.main',
                  color: 'common.white', fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {activeChips.length}
              </Box>
            )}
          </Button>
        </Box>
      )}

      {/* ============ Body: 280px sticky sidebar + flex-1 results — no outer container, edge to edge ============ */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        {/* ---- LEFT SIDEBAR (desktop only) — fixed 280px, sticky beneath the 72px navbar, sidebar itself scrolls ---- */}
        {isDesktop && (
          <Box
            sx={{
              width: 280,
              flexShrink: 0,
              position: 'sticky',
              top: 72,
              height: 'calc(100vh - 72px)',
              overflowY: 'auto',
              bgcolor: 'background.paper',
              borderInlineEnd: 1,
              borderColor: 'divider',
              pt: 3,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 3, mb: 2 }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {t('search.filters')}
              </Typography>
              {activeChips.length > 0 && (
                <Button size="small" onClick={clearFilters} sx={{ fontSize: 12, minWidth: 0, p: 0.5 }}>
                  {t('search.clearFilters')}
                </Button>
              )}
            </Stack>
            <FilterPanel {...filterPanelProps} />
            <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ background: theme.eawlma.gradient, fontWeight: 700 }}
                onClick={() => infiniteQuery.refetch()}
              >
                {t('search.applyFilters', { defaultValue: 'Apply filters' })}
              </Button>
            </Box>
          </Box>
        )}

        {/* ---- MAIN CONTENT ---- */}
        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 3, sm: 4, md: 4 }, pt: 3, pb: 6 }}>
            {/* Slim breadcrumb — results summary + sort/view toggle */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mb: 3 }}
            >
              <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>
                {t('search.searchResults')} ·{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {total.toLocaleString(i18n.language)} {t('search.propertiesFound')}
                </Box>
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <TextField
                  select
                  size="small"
                  label={t('search.sortBy')}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="createdAt">{t('search.newest')}</MenuItem>
                  <MenuItem value="price">{t('search.priceAsc')}</MenuItem>
                  <MenuItem value="popularity">{t('search.popular')}</MenuItem>
                  <MenuItem value="area">{t('search.areaDesc')}</MenuItem>
                </TextField>
                <ToggleButtonGroup
                  value={view}
                  exclusive
                  size="small"
                  onChange={(_, v) => v && setView(v as ViewMode)}
                  aria-label="view mode"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 1.25,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
                  <ToggleButton value="list"><ListViewIcon fontSize="small" /></ToggleButton>
                  <ToggleButton value="map"><MapViewIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 0.75 }}>
                {activeChips.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.dark',
                      fontWeight: 600,
                      border: 'none',
                    }}
                  />
                ))}
              </Stack>
            )}

            {/* Results */}
            {view === 'map' ? (
              <MapView listings={listings} />
            ) : infiniteQuery.isLoading ? (
              <Grid container spacing={view === 'grid' ? 2 : 1.5}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid key={i} item xs={12} sm={view === 'grid' ? 6 : 12} lg={view === 'grid' ? 4 : 12}>
                    <SkeletonCard />
                  </Grid>
                ))}
              </Grid>
            ) : listings.length === 0 ? (
              <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 4 }}>
                <EmptyState
                  title={t('search.noResults')}
                  ctaLabel={t('search.clearFilters')}
                  onCta={clearFilters}
                />
              </Box>
            ) : view === 'grid' ? (
              <Grid container spacing={3}>
                {listings.map((listing, i) => (
                  <Grid key={listing.id} item xs={12} sm={6} lg={4}>
                    <Reveal delay={Math.min(i, 11) * 0.04}>
                      <ListingCard
                        listing={listing}
                        saved={savedIds.includes(listing.id)}
                        onToggleSave={toggleSaved}
                      />
                    </Reveal>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Stack spacing={1.5}>
                {listings.map((listing, i) => (
                  <Reveal key={listing.id} delay={Math.min(i, 11) * 0.04}>
                    <ListingRow
                      listing={listing}
                      saved={savedIds.includes(listing.id)}
                      onToggleSave={toggleSaved}
                    />
                  </Reveal>
                ))}
              </Stack>
            )}

          <Box ref={sentinelRef} sx={{ height: 24, mt: 4 }} />
          {infiniteQuery.isFetchingNextPage && (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
            </Stack>
          )}
        </Box>
      </Box>

      {/* ============ Mobile bottom-sheet drawer ============ */}
      <Drawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88vh' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
          {/* drag handle */}
          <Box sx={{ pt: 1.25, pb: 0.5, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: 36, height: 4, bgcolor: 'grey.300', borderRadius: 2 }} />
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, pb: 1.25, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('search.filters')}
            </Typography>
            <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            <FilterPanel {...filterPanelProps} />
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            <Button fullWidth variant="outlined" onClick={clearFilters}>
              {t('search.clearFilters')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setFilterDrawerOpen(false)}
              sx={{ background: theme.eawlma.gradient }}
            >
              {total > 0
                ? `${t('common.confirm')} (${total.toLocaleString(i18n.language)})`
                : t('common.confirm')}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}

// ------------------------------------------------------------------
// FilterPanel — collapsible accordion sections (Haraj-style)
// ------------------------------------------------------------------

interface FilterPanelProps {
  type: ListingType | '';
  setType: (v: ListingType | '') => void;
  propertyTypes: PropertyType[];
  setPropertyTypes: (v: PropertyType[]) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  areaRange: [number, number];
  setAreaRange: (v: [number, number]) => void;
  minBedrooms: string;
  setMinBedrooms: (v: string) => void;
  minBathrooms: string;
  setMinBathrooms: (v: string) => void;
  amenities: string[];
  setAmenities: (v: string[]) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  city: string;
  setCity: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
}

function FilterPanel(props: FilterPanelProps) {
  const { t } = useTranslation();
  const propTypeOptions: PropertyType[] = [
    PropertyType.APARTMENT,
    PropertyType.VILLA,
    PropertyType.OFFICE,
    PropertyType.LAND,
    PropertyType.COMMERCIAL,
    PropertyType.STUDIO,
    PropertyType.PENTHOUSE,
    PropertyType.TOWNHOUSE,
  ];

  return (
    <Box>
      {/* Listing type — always visible at top, no accordion */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={props.type}
          onChange={(_, v) => props.setType((v ?? '') as ListingType | '')}
          sx={{
            '& .MuiToggleButton-root': {
              fontWeight: 600,
              fontSize: 12,
              py: 0.75,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'common.white',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            },
          }}
        >
          <ToggleButton value="">{t('common.viewAll')}</ToggleButton>
          <ToggleButton value={ListingType.SALE}>{t('listing.forSale')}</ToggleButton>
          <ToggleButton value={ListingType.RENT}>{t('listing.forRent')}</ToggleButton>
        </ToggleButtonGroup>
        {/* Featured-only toggle lives next to the listing-type pill so the
         *  whole sidebar ends with the city section + sticky Apply button. */}
        <Chip
          icon={<VerifiedIcon fontSize="small" />}
          label={t('listing.featured')}
          onClick={() => props.setVerifiedOnly(!props.verifiedOnly)}
          sx={{
            mt: 1.5,
            cursor: 'pointer',
            fontWeight: 700,
            bgcolor: props.verifiedOnly ? 'primary.main' : 'transparent',
            color: props.verifiedOnly ? 'common.white' : 'text.primary',
            border: '1px solid',
            borderColor: props.verifiedOnly ? 'primary.main' : 'divider',
            '& .MuiChip-icon': {
              color: props.verifiedOnly ? 'common.white' : 'primary.main',
            },
          }}
        />
      </Box>

      <FilterSection title={t('search.propertyType')} defaultExpanded>
        <Stack spacing={0.25}>
          {propTypeOptions.map((pt) => {
            const checked = props.propertyTypes.includes(pt);
            return (
              <FormControlLabel
                key={pt}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={() =>
                      props.setPropertyTypes(
                        checked
                          ? props.propertyTypes.filter((x) => x !== pt)
                          : [...props.propertyTypes, pt],
                      )
                    }
                  />
                }
                label={
                  <Typography sx={{ fontSize: '1rem' }}>
                    {t(`propertyTypes.${pt.toLowerCase()}`, { defaultValue: pt })}
                  </Typography>
                }
              />
            );
          })}
        </Stack>
      </FilterSection>

      <FilterSection
        title={`${t('listing.price')} (${t('listing.currency')})`}
        defaultExpanded
      >
        <Box sx={{ px: 0.5 }}>
          <Slider
            value={props.priceRange}
            onChange={(_, value) => props.setPriceRange(value as [number, number])}
            min={PRICE_BOUNDS[0]}
            max={PRICE_BOUNDS[1]}
            step={50_000}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${(v / 1000).toLocaleString()}K`}
          />
          {/* Min / Max numeric inputs — easier precision than the slider alone */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <TextField
              size="small"
              type="number"
              label={`Min ${t('listing.currency')}`}
              value={props.priceRange[0]}
              onChange={(e) => {
                const v = Math.max(PRICE_BOUNDS[0], Math.min(Number(e.target.value) || 0, props.priceRange[1]));
                props.setPriceRange([v, props.priceRange[1]]);
              }}
              fullWidth
            />
            <TextField
              size="small"
              type="number"
              label={`Max ${t('listing.currency')}`}
              value={props.priceRange[1]}
              onChange={(e) => {
                const v = Math.min(PRICE_BOUNDS[1], Math.max(Number(e.target.value) || 0, props.priceRange[0]));
                props.setPriceRange([props.priceRange[0], v]);
              }}
              fullWidth
            />
          </Stack>
        </Box>
      </FilterSection>

      <FilterSection title={`${t('listing.area')} (${t('listing.areaUnit')})`}>
        <Box sx={{ px: 0.5 }}>
          <Slider
            value={props.areaRange}
            onChange={(_, value) => props.setAreaRange(value as [number, number])}
            min={AREA_BOUNDS[0]}
            max={AREA_BOUNDS[1]}
            step={10}
            valueLabelDisplay="auto"
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {props.areaRange[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {props.areaRange[1]}
            </Typography>
          </Stack>
        </Box>
      </FilterSection>

      <FilterSection title={t('search.minBedrooms')}>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={props.minBedrooms}
          onChange={(_, v) => props.setMinBedrooms((v ?? '') as string)}
        >
          {['', '1', '2', '3', '4', '5'].map((v) => (
            <ToggleButton key={v} value={v} sx={{ fontWeight: 600, fontSize: 12 }}>
              {v === '' ? '—' : `${v}+`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FilterSection>

      <FilterSection title={t('search.minBathrooms', { defaultValue: 'Min bathrooms' })}>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={props.minBathrooms}
          onChange={(_, v) => props.setMinBathrooms((v ?? '') as string)}
        >
          {['', '1', '2', '3', '4', '5'].map((v) => (
            <ToggleButton key={v} value={v} sx={{ fontWeight: 600, fontSize: 12 }}>
              {v === '' ? '—' : `${v}+`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FilterSection>

      <FilterSection title={t('listing.amenities')}>
        <Stack spacing={0.25}>
          {AMENITY_OPTIONS.map((a) => {
            const checked = props.amenities.includes(a.key);
            return (
              <FormControlLabel
                key={a.key}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={() =>
                      props.setAmenities(
                        checked ? props.amenities.filter((x) => x !== a.key) : [...props.amenities, a.key],
                      )
                    }
                  />
                }
                label={
                  <Typography sx={{ fontSize: '1rem' }}>
                    {t(`listing.${a.labelKey}`, { defaultValue: a.defaultLabel })}
                  </Typography>
                }
              />
            );
          })}
        </Stack>
      </FilterSection>

      <FilterSection title={t('search.city')}>
        <Stack spacing={1}>
          <TextField
            size="small"
            placeholder={t('search.city')}
            value={props.city}
            onChange={(e) => props.setCity(e.target.value)}
          />
          <TextField
            size="small"
            placeholder={t('search.district')}
            value={props.district}
            onChange={(e) => props.setDistrict(e.target.value)}
          />
        </Stack>
      </FilterSection>

    </Box>
  );
}

function FilterSection({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      square
      sx={{
        '&::before': { display: 'none' },
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'transparent',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          px: 3,
          py: 0.5,
          minHeight: 56,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'primary.main',
          }}
        >
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

// ------------------------------------------------------------------
// MapView
// ------------------------------------------------------------------

const MAP_LIBRARIES: ('places')[] = ['places'];
const MAP_DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

function MapView({ listings }: { listings: Listing[] }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!apiKey) {
    return <EmptyState title="Google Maps API key not configured" description="Set VITE_GOOGLE_MAPS_API_KEY to enable the map view." />;
  }
  if (loadError) {
    return <EmptyState title="Failed to load map" description={(loadError as Error).message} />;
  }
  if (!isLoaded) {
    return <Box sx={{ height: 600, bgcolor: 'grey.100', borderRadius: 2 }} />;
  }

  const active = listings.find((l) => l.id === activeId);
  const center = listings[0]
    ? { lat: Number(listings[0].lat), lng: Number(listings[0].lng) }
    : MAP_DEFAULT_CENTER;

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      {/* Map legend — themed via tokens so it stays legible in both light
       *  and dark modes without hardcoded white. */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 1.5,
          minWidth: 220,
          boxShadow: '0 6px 18px rgba(26,26,46,0.10)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            display: 'block',
            mb: 1,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          Map legend
        </Typography>
        <Stack spacing={0.6}>
          <LegendRow color="#6C63A6" label="Individual listing (price)" />
          <LegendRow color="#4285F4" label="Cluster of listings" shape="circle" />
          <LegendRow color="#D4A843" label="Selected listing" />
        </Stack>
      </Box>

      <GoogleMap
        center={center}
        zoom={11}
        mapContainerStyle={{ width: '100%', height: 'calc(100vh - 220px)', minHeight: 480 }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {listings.map((l) => (
                <MarkerF
                  key={l.id}
                  position={{ lat: Number(l.lat), lng: Number(l.lng) }}
                  clusterer={clusterer}
                  onClick={() => setActiveId(l.id)}
                  // Custom SVG: rounded pill, lavender bg, white text. Active
                  // marker switches to gold to surface the selection.
                  icon={makeMarkerIcon(priceLabel(l), l.id === activeId)}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
        {active && (
          <InfoWindowF
            position={{ lat: Number(active.lat), lng: Number(active.lng) }}
            onCloseClick={() => setActiveId(null)}
            options={{ pixelOffset: new google.maps.Size(0, -16) }}
          >
            <Box sx={{ minWidth: 260, maxWidth: 280, p: 0.25 }}>
              <Box
                component="img"
                src={listingCoverUrl(active)}
                alt={getListingTitle(active, 'en')}
                sx={{
                  width: '100%',
                  height: 130,
                  objectFit: 'cover',
                  borderRadius: 1,
                  display: 'block',
                  mb: 1,
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {getListingTitle(active, 'en')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {getListingLocation(active)}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 0.5, color: 'primary.dark', fontWeight: 800 }}>
                {Number(active.price).toLocaleString()} SAR
              </Typography>
              <Button
                size="small"
                href={`/listings/${active.id}`}
                sx={{ mt: 1, background: 'linear-gradient(135deg, #6C63A6 0%, #4A4080 100%)', color: '#fff' }}
                variant="contained"
                fullWidth
              >
                View details
              </Button>
            </Box>
          </InfoWindowF>
        )}
      </GoogleMap>
    </Box>
  );
}

function LegendRow({ color, label, shape = 'pill' }: { color: string; label: string; shape?: 'pill' | 'circle' }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={{
          width: shape === 'circle' ? 18 : 32,
          height: 18,
          borderRadius: shape === 'circle' ? '50%' : 999,
          bgcolor: color,
          border: '1px solid rgba(0,0,0,0.18)',
          flexShrink: 0,
        }}
      />
      <Typography variant="caption" sx={{ fontSize: 12, color: 'text.primary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

// Build a rounded-pill SVG marker with the listing's price as a data-URL icon.
// Lavender by default; gold when the marker corresponds to the active listing.
function makeMarkerIcon(label: string, active: boolean): google.maps.Icon {
  const fill = active ? '#D4A843' : '#6C63A6';
  const textColor = active ? '#1A1A2E' : '#FFFFFF';
  const width = Math.max(64, label.length * 9 + 22);
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='32' viewBox='0 0 ${width} 32'>
      <rect x='1' y='1' width='${width - 2}' height='28' rx='14' fill='${fill}' stroke='rgba(0,0,0,0.18)' stroke-width='1'/>
      <text x='${width / 2}' y='19' font-family='Inter, system-ui, sans-serif' font-size='12' font-weight='700' fill='${textColor}' text-anchor='middle'>${label}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, 32),
    anchor: new google.maps.Point(width / 2, 16),
  };
}

function priceLabel(l: Listing): string {
  const n = Number(l.price);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ------------------------------------------------------------------
// Active filter chips
// ------------------------------------------------------------------

interface ChipDef {
  key: string;
  label: string;
}

function buildActiveChips(state: {
  q: string;
  type: ListingType | '';
  city: string;
  district: string;
  priceRange: [number, number];
  areaRange: [number, number];
  minBedrooms: string;
  minBathrooms: string;
  propertyTypes: PropertyType[];
  amenities: string[];
  verifiedOnly: boolean;
}): ChipDef[] {
  const out: ChipDef[] = [];
  if (state.q) out.push({ key: 'q', label: `"${state.q}"` });
  if (state.type) out.push({ key: 'type', label: state.type });
  if (state.city) out.push({ key: 'city', label: state.city });
  if (state.district) out.push({ key: 'district', label: state.district });
  if (state.priceRange[0] > PRICE_BOUNDS[0] || state.priceRange[1] < PRICE_BOUNDS[1]) {
    out.push({
      key: 'price',
      label: `${state.priceRange[0].toLocaleString()} – ${state.priceRange[1].toLocaleString()}`,
    });
  }
  if (state.areaRange[0] > AREA_BOUNDS[0] || state.areaRange[1] < AREA_BOUNDS[1]) {
    out.push({ key: 'area', label: `${state.areaRange[0]}–${state.areaRange[1]} m²` });
  }
  if (state.minBedrooms) out.push({ key: 'beds', label: `${state.minBedrooms}+ 🛏` });
  if (state.minBathrooms) out.push({ key: 'baths', label: `${state.minBathrooms}+ 🛁` });
  for (const pt of state.propertyTypes) out.push({ key: `pt-${pt}`, label: pt });
  for (const a of state.amenities) out.push({ key: `am-${a}`, label: a.replace(/^has/, '') });
  if (state.verifiedOnly) out.push({ key: 'featured', label: '★ featured' });
  return out;
}

// ------------------------------------------------------------------
// ListingRow — full-width row card used by the list-view mode
// ------------------------------------------------------------------

interface ListingRowProps {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (listingId: string) => void | Promise<void>;
}

function ListingRow({ listing, saved, onToggleSave }: ListingRowProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const coverUrl = listingCoverUrl(listing);
  const title = getListingTitle(listing, i18n.language);
  const location = getListingLocation(listing);
  const isSale = listing.type === ListingType.SALE;
  const goToDetail = () => {
    void navigate({ to: `/listings/${listing.id}` as never });
  };

  return (
    <Box
      onClick={goToDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.4),
          boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
        },
      }}
    >
      {/* Image — fixed 200px on desktop, full-width 180px on mobile */}
      <Box
        sx={{
          position: 'relative',
          width: { xs: '100%', sm: 200 },
          height: { xs: 180, sm: 160 },
          flexShrink: 0,
          bgcolor: 'grey.100',
        }}
      >
        <Box
          component="img"
          src={coverUrl}
          alt={title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        {listing.isFeatured && (
          <Chip
            size="small"
            icon={<StarIcon sx={{ fontSize: 12, color: '#1A1A2E !important' }} />}
            label={t('listing.featured')}
            sx={{
              position: 'absolute',
              top: 8,
              insetInlineStart: 8,
              height: 22,
              fontWeight: 700,
              fontSize: 10.5,
              bgcolor: theme.eawlma.gold,
              color: '#1A1A2E',
              border: 'none',
              '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
            }}
          />
        )}
      </Box>

      {/* Content — flex 1, full remaining width */}
      <Box sx={{ p: { xs: 1.75, sm: 2 }, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
              <Chip
                size="small"
                label={isSale ? t('listing.forSale') : t('listing.forRent')}
                sx={{
                  height: 20,
                  fontWeight: 700,
                  fontSize: 10.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.dark',
                  border: 'none',
                }}
              />
              <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t(`listing.${listing.propertyType}`, { defaultValue: listing.propertyType })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                · {listing.referenceCode}
              </Typography>
            </Stack>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, color: 'text.secondary' }}>
              <PlaceIcon sx={{ fontSize: 14 }} />
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {location}
              </Typography>
            </Stack>
          </Box>

          {/* Right column: price + favourite */}
          <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Box
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave?.(listing.id);
              }}
              sx={{
                cursor: 'pointer',
                color: saved ? 'error.main' : 'text.secondary',
                p: 0.5,
                borderRadius: 999,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              role="button"
              aria-label={saved ? t('listing.saved') : t('listing.save')}
            >
              {saved ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            </Box>
            <Box
              sx={{
                background: theme.eawlma.gradient,
                color: 'common.white',
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 14px rgba(74,64,128,0.28)',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {Number(listing.price).toLocaleString(i18n.language)}
                <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.92 }}>
                  {t('listing.currency')}
                </Typography>
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Bottom row: features at-a-glance */}
        <Stack
          direction="row"
          spacing={2}
          divider={<Box sx={{ width: 1, height: 14, bgcolor: 'divider', alignSelf: 'center' }} />}
          sx={{ mt: 'auto', pt: 1.25, color: 'text.primary' }}
        >
          {listing.bedrooms !== null && listing.bedrooms !== undefined && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <BedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{listing.bedrooms}</Typography>
            </Stack>
          )}
          {listing.bathrooms !== null && listing.bathrooms !== undefined && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <BathIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{listing.bathrooms}</Typography>
            </Stack>
          )}
          {listing.area !== null && listing.area !== undefined && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AreaIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                {Number(listing.area).toLocaleString(i18n.language)} {t('listing.areaUnit')}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
