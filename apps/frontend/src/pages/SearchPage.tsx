import {
  Box,
  Button,
  Chip,
  Container,
  Drawer,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ListViewIcon from '@mui/icons-material/ViewList';
import MapViewIcon from '@mui/icons-material/Map';
import FilterIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
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
} from '@aqarat/shared-types';
import { searchApi, type FlatSearchParams } from '@/api/search.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { useSavedStore } from '@/store/saved.store';

type ViewMode = 'grid' | 'list' | 'map';

interface SearchPageSearch {
  q?: string;
  type?: ListingType;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minArea?: number;
  propertyTypes?: string;
  isFeatured?: boolean;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  view?: ViewMode;
}

const PAGE_SIZE = 12;
const PRICE_BOUNDS: [number, number] = [0, 5_000_000];

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as SearchPageSearch;
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  // ----- local filter state derived from URL --------------------------
  const [q, setQ] = useState(search.q ?? '');
  const [type, setType] = useState<ListingType | ''>(search.type ?? '');
  const [city, setCity] = useState(search.city ?? '');
  const [district, setDistrict] = useState(search.district ?? '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(search.minPrice ?? PRICE_BOUNDS[0]),
    Number(search.maxPrice ?? PRICE_BOUNDS[1]),
  ]);
  const [minBedrooms, setMinBedrooms] = useState<string>(
    search.minBedrooms ? String(search.minBedrooms) : '',
  );
  const [minArea, setMinArea] = useState<string>(search.minArea ? String(search.minArea) : '');
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(search.isFeatured));
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(
    search.propertyTypes ? (search.propertyTypes.split(',') as PropertyType[]) : [],
  );
  const [sort, setSort] = useState<string>(search.sortField ?? 'createdAt');
  const [view, setView] = useState<ViewMode>((search.view as ViewMode) ?? 'grid');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Push filter state back to URL so it's deep-linkable.
  useEffect(() => {
    const next: Record<string, string | number | undefined> = {
      q: q || undefined,
      type: type || undefined,
      city: city || undefined,
      district: district || undefined,
      minPrice: priceRange[0] > PRICE_BOUNDS[0] ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < PRICE_BOUNDS[1] ? priceRange[1] : undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
      minArea: minArea ? Number(minArea) : undefined,
      isFeatured: verifiedOnly ? 'true' : undefined,
      propertyTypes: propertyTypes.length > 0 ? propertyTypes.join(',') : undefined,
      sortField: sort !== 'createdAt' ? sort : undefined,
      view: view !== 'grid' ? view : undefined,
    };
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
    navigate({ to: '/search' as never, search: next as never, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, city, district, priceRange, minBedrooms, minArea, verifiedOnly, propertyTypes, sort, view]);

  // ----- query --------------------------------------------------------
  const buildParams = (page: number): FlatSearchParams => ({
    q: q || undefined,
    type: type || undefined,
    city: city || undefined,
    district: district || undefined,
    minPrice: priceRange[0] > PRICE_BOUNDS[0] ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < PRICE_BOUNDS[1] ? priceRange[1] : undefined,
    minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
    minArea: minArea ? Number(minArea) : undefined,
    propertyTypes: propertyTypes.length > 0 ? propertyTypes : undefined,
    isFeatured: verifiedOnly || undefined,
    sortField: sort,
    page,
    limit: PAGE_SIZE,
  });

  const queryKey = useMemo(
    () => ['search', { q, type, city, district, priceRange, minBedrooms, minArea, propertyTypes, verifiedOnly, sort }],
    [q, type, city, district, priceRange, minBedrooms, minArea, propertyTypes, verifiedOnly, sort],
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

  // ----- active filter chips ------------------------------------------
  const activeChips = buildActiveChips({ q, type, city, district, priceRange, minBedrooms, minArea, propertyTypes, verifiedOnly }, t);
  const clearFilters = () => {
    setQ(''); setType(''); setCity(''); setDistrict('');
    setPriceRange(PRICE_BOUNDS); setMinBedrooms(''); setMinArea('');
    setPropertyTypes([]); setVerifiedOnly(false);
  };

  return (
    <Box>
      <Helmet>
        <title>{t('nav.search')} — {t('app.name')}</title>
      </Helmet>

      {/* ---------------- Sticky filter bar ---------------- */}
      <Box
        sx={{
          position: 'sticky',
          top: 64,
          zIndex: 4,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          py: 2,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder={t('nav.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ flex: 1, maxWidth: 380 }}
            />
            {!isDesktop && (
              <Button startIcon={<FilterIcon />} onClick={() => setFilterDrawerOpen(true)} variant="outlined">
                {t('search.filters')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <TextField
              select
              size="small"
              label={t('search.sortBy')}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="createdAt">{t('search.newest')}</MenuItem>
              <MenuItem value="price">{t('search.priceAsc')}</MenuItem>
              <MenuItem value="popularity">{t('search.popular')}</MenuItem>
              <MenuItem value="area">{t('search.areaDesc')}</MenuItem>
              <MenuItem value="relevance">{t('search.popular')}</MenuItem>
            </TextField>
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, v) => v && setView(v as ViewMode)}
              aria-label="view mode"
            >
              <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="list"><ListViewIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="map"><MapViewIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
              {activeChips.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  onDelete={c.onClear}
                  size="small"
                  color="primary"
                  variant="filled"
                />
              ))}
              <Button size="small" onClick={clearFilters} sx={{ ml: 1 }}>
                {t('search.clearFilters')}
              </Button>
            </Stack>
          )}
        </Container>
      </Box>

      {/* ---------------- Body ---------------- */}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={4}>
          {/* Sidebar filters (desktop) */}
          {isDesktop && (
            <Grid item xs={12} md={3}>
              <FilterPanel
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                propertyTypes={propertyTypes}
                setPropertyTypes={setPropertyTypes}
                city={city}
                setCity={setCity}
                district={district}
                setDistrict={setDistrict}
                minBedrooms={minBedrooms}
                setMinBedrooms={setMinBedrooms}
                minArea={minArea}
                setMinArea={setMinArea}
                verifiedOnly={verifiedOnly}
                setVerifiedOnly={setVerifiedOnly}
                type={type}
                setType={setType}
              />
            </Grid>
          )}

          {/* Results */}
          <Grid item xs={12} md={isDesktop ? 9 : 12}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {total > 0 ? `${total.toLocaleString(i18n.language)} ${t('search.results')}` : t('common.search')}
              </Typography>
            </Stack>

            {view === 'map' ? (
              <MapView listings={listings} />
            ) : infiniteQuery.isLoading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid key={i} item xs={12} sm={6} lg={view === 'grid' ? 4 : 12}>
                    <SkeletonCard />
                  </Grid>
                ))}
              </Grid>
            ) : listings.length === 0 ? (
              <EmptyState title={t('search.noResults')} ctaLabel={t('search.clearFilters')} onCta={clearFilters} />
            ) : view === 'grid' ? (
              <Grid container spacing={3}>
                {listings.map((listing) => (
                  <Grid key={listing.id} item xs={12} sm={6} lg={4}>
                    <ListingCard
                      listing={listing}
                      saved={savedIds.includes(listing.id)}
                      onToggleSave={toggleSaved}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Stack spacing={2}>
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    onToggleSave={toggleSaved}
                  />
                ))}
              </Stack>
            )}

            {/* Infinite scroll sentinel */}
            <Box ref={sentinelRef} sx={{ height: 24, mt: 4 }} />
            {infiniteQuery.isFetchingNextPage && (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* ---------------- Mobile filter drawer ---------------- */}
      <Drawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh' } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('search.filters')}</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)}><CloseIcon /></IconButton>
          </Stack>
          <FilterPanel
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            propertyTypes={propertyTypes}
            setPropertyTypes={setPropertyTypes}
            city={city}
            setCity={setCity}
            district={district}
            setDistrict={setDistrict}
            minBedrooms={minBedrooms}
            setMinBedrooms={setMinBedrooms}
            minArea={minArea}
            setMinArea={setMinArea}
            verifiedOnly={verifiedOnly}
            setVerifiedOnly={setVerifiedOnly}
            type={type}
            setType={setType}
          />
          <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={() => setFilterDrawerOpen(false)}>
            {t('common.confirm')}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}

// ------------------------------------------------------------------
// FilterPanel
// ------------------------------------------------------------------

interface FilterPanelProps {
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  propertyTypes: PropertyType[];
  setPropertyTypes: (v: PropertyType[]) => void;
  city: string;
  setCity: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  minBedrooms: string;
  setMinBedrooms: (v: string) => void;
  minArea: string;
  setMinArea: (v: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  type: ListingType | '';
  setType: (v: ListingType | '') => void;
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
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('search.type')}</Typography>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={props.type}
          onChange={(_, v) => props.setType((v ?? '') as ListingType | '')}
        >
          <ToggleButton value="">{t('common.viewAll')}</ToggleButton>
          <ToggleButton value={ListingType.SALE}>{t('listing.forSale')}</ToggleButton>
          <ToggleButton value={ListingType.RENT}>{t('listing.forRent')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('search.propertyType')}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {propTypeOptions.map((pt) => {
            const selected = props.propertyTypes.includes(pt);
            return (
              <Chip
                key={pt}
                label={pt}
                size="small"
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => {
                  props.setPropertyTypes(
                    selected ? props.propertyTypes.filter((x) => x !== pt) : [...props.propertyTypes, pt],
                  );
                }}
              />
            );
          })}
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('search.city')}</Typography>
        <TextField size="small" value={props.city} onChange={(e) => props.setCity(e.target.value)} />
        <TextField
          size="small"
          placeholder={t('search.district')}
          value={props.district}
          onChange={(e) => props.setDistrict(e.target.value)}
        />
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {t('listing.price')} ({props.priceRange[0].toLocaleString()} – {props.priceRange[1].toLocaleString()} {t('listing.currency')})
        </Typography>
        <Slider
          value={props.priceRange}
          onChange={(_, value) => props.setPriceRange(value as [number, number])}
          min={PRICE_BOUNDS[0]}
          max={PRICE_BOUNDS[1]}
          step={50_000}
          valueLabelDisplay="auto"
        />
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('search.minBedrooms')}</Typography>
        <ToggleButtonGroup
          fullWidth
          exclusive
          size="small"
          value={props.minBedrooms}
          onChange={(_, v) => props.setMinBedrooms((v ?? '') as string)}
        >
          {['', '1', '2', '3', '4', '5'].map((v) => (
            <ToggleButton key={v} value={v}>{v === '' ? '—' : `${v}+`}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <TextField
        size="small"
        type="number"
        label={`${t('search.minArea')} (${t('listing.areaUnit')})`}
        value={props.minArea}
        onChange={(e) => props.setMinArea(e.target.value)}
      />

      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          icon={<VerifiedIcon fontSize="small" />}
          label={t('listing.featured')}
          color={props.verifiedOnly ? 'primary' : 'default'}
          variant={props.verifiedOnly ? 'filled' : 'outlined'}
          onClick={() => props.setVerifiedOnly(!props.verifiedOnly)}
        />
      </Stack>
    </Stack>
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
    return <Box sx={{ height: 600, bgcolor: 'grey.100', borderRadius: 3 }} />;
  }

  const active = listings.find((l) => l.id === activeId);
  const center = listings[0]
    ? { lat: Number(listings[0].lat), lng: Number(listings[0].lng) }
    : MAP_DEFAULT_CENTER;

  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
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
                  label={{
                    text: priceLabel(l),
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0F172A',
                  }}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
        {active && (
          <InfoWindowF
            position={{ lat: Number(active.lat), lng: Number(active.lng) }}
            onCloseClick={() => setActiveId(null)}
          >
            <Box sx={{ minWidth: 240, p: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{active.title}</Typography>
              <Typography variant="body2" color="text.secondary">{active.city}</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                {Number(active.price).toLocaleString()} SAR
              </Typography>
              <Button
                size="small"
                href={`/listings/${active.id}`}
                sx={{ mt: 1 }}
                variant="contained"
              >
                View Details
              </Button>
            </Box>
          </InfoWindowF>
        )}
      </GoogleMap>
    </Box>
  );
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
  onClear: () => void;
}

function buildActiveChips(state: {
  q: string; type: ListingType | ''; city: string; district: string;
  priceRange: [number, number]; minBedrooms: string; minArea: string;
  propertyTypes: PropertyType[]; verifiedOnly: boolean;
}, _t: (k: string) => string): ChipDef[] {
  const out: ChipDef[] = [];
  if (state.q) out.push({ key: 'q', label: `"${state.q}"`, onClear: () => undefined });
  if (state.type) out.push({ key: 'type', label: state.type, onClear: () => undefined });
  if (state.city) out.push({ key: 'city', label: state.city, onClear: () => undefined });
  if (state.district) out.push({ key: 'district', label: state.district, onClear: () => undefined });
  if (state.priceRange[0] > PRICE_BOUNDS[0] || state.priceRange[1] < PRICE_BOUNDS[1]) {
    out.push({
      key: 'price',
      label: `${state.priceRange[0].toLocaleString()} – ${state.priceRange[1].toLocaleString()}`,
      onClear: () => undefined,
    });
  }
  if (state.minBedrooms) out.push({ key: 'beds', label: `${state.minBedrooms}+ 🛏`, onClear: () => undefined });
  if (state.minArea) out.push({ key: 'area', label: `≥${state.minArea} m²`, onClear: () => undefined });
  for (const pt of state.propertyTypes) out.push({ key: `pt-${pt}`, label: pt, onClear: () => undefined });
  if (state.verifiedOnly) out.push({ key: 'featured', label: '★ featured', onClear: () => undefined });
  return out;
}
