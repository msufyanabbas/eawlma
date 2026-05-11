import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ListingType, PropertyType, type Listing } from '@eawlma/shared-types';

import { searchApi, type FlatSearchParams } from '@/api/search.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

// ------------------------------------------------------------------
// Constants — classifieds layout, Eawlma palette
// ------------------------------------------------------------------

const CITIES_AR_EN: Array<{ ar: string; en: string }> = [
  { ar: 'الرياض', en: 'Riyadh' },
  { ar: 'جدة', en: 'Jeddah' },
  { ar: 'الدمام', en: 'Dammam' },
  { ar: 'مكة', en: 'Mecca' },
  { ar: 'المدينة المنورة', en: 'Medina' },
  { ar: 'الخبر', en: 'Khobar' },
  { ar: 'الطائف', en: 'Taif' },
  { ar: 'بريدة', en: 'Buraidah' },
];

type CategoryDef = {
  icon: string;
  labelEn: string;
  labelAr: string;
  filter: string;
};

const CATEGORIES: CategoryDef[] = [
  { icon: '🏠', labelEn: 'All', labelAr: 'الكل', filter: '' },
  { icon: '🏢', labelEn: 'For Sale', labelAr: 'للبيع', filter: 'sale' },
  { icon: '🔑', labelEn: 'For Rent', labelAr: 'للإيجار', filter: 'rent' },
  { icon: '🏙️', labelEn: 'Apartments', labelAr: 'شقق', filter: 'apartment' },
  { icon: '🏡', labelEn: 'Villas', labelAr: 'فلل', filter: 'villa' },
  { icon: '🏗️', labelEn: 'Land', labelAr: 'أراضي', filter: 'land' },
  { icon: '🏖️', labelEn: 'Chalets', labelAr: 'شاليهات', filter: 'chalet' },
  { icon: '🌾', labelEn: 'Farms', labelAr: 'مزارع', filter: 'farm' },
  { icon: '🛖', labelEn: 'Rest Houses', labelAr: 'استراحات', filter: 'rest_house' },
  { icon: '🏨', labelEn: 'Hotels', labelAr: 'فنادق', filter: 'hotel_room' },
  { icon: '🏬', labelEn: 'Commercial', labelAr: 'تجاري', filter: 'commercial' },
  { icon: '🏦', labelEn: 'Offices', labelAr: 'مكاتب', filter: 'office' },
];

type QuickItem = { en: string; ar: string; type?: ListingType; pt?: PropertyType; city?: string };

const QUICK_BROWSE: QuickItem[] = [
  { en: 'Apartments for rent', ar: 'شقق للإيجار', type: ListingType.RENT, pt: PropertyType.APARTMENT },
  { en: 'Villas for sale', ar: 'فلل للبيع', type: ListingType.SALE, pt: PropertyType.VILLA },
  { en: 'Land for sale', ar: 'أراضي للبيع', type: ListingType.SALE, pt: PropertyType.LAND },
  { en: 'Chalets', ar: 'شاليهات', pt: PropertyType.CHALET },
  { en: 'Rest houses', ar: 'استراحات', pt: PropertyType.REST_HOUSE },
  { en: 'Riyadh', ar: 'الرياض', city: 'Riyadh' },
  { en: 'Jeddah', ar: 'جدة', city: 'Jeddah' },
];

const TX_OPTIONS = ['All', 'Sale', 'Rent'] as const;
type TxOption = (typeof TX_OPTIONS)[number];
const TX_LABEL_AR: Record<TxOption, string> = { All: 'الكل', Sale: 'بيع', Rent: 'إيجار' };

const BED_OPTIONS = ['Any', '1', '2', '3', '4', '5+'] as const;
type BedOption = (typeof BED_OPTIONS)[number];

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const PROPERTY_TYPE_VALUES = new Set<string>(Object.values(PropertyType));

function resolvePropertyTypes(slug: string): PropertyType[] | undefined {
  if (!slug) return undefined;
  if (slug === 'sale' || slug === 'rent') return undefined;
  if (PROPERTY_TYPE_VALUES.has(slug)) return [slug as PropertyType];
  return undefined;
}

function sortToFields(sort: SortOption): { sortField: string; sortOrder: 'ASC' | 'DESC' } {
  if (sort === 'price_asc') return { sortField: 'price', sortOrder: 'ASC' };
  if (sort === 'price_desc') return { sortField: 'price', sortOrder: 'DESC' };
  return { sortField: 'createdAt', sortOrder: 'DESC' };
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';
  const user = useAuthStore((s) => s.user);
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeCategory, setActiveCategory] = useState('');
  const [txFilter, setTxFilter] = useState<TxOption>('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedsFilter, setBedsFilter] = useState<BedOption>('Any');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Free-text and price are committed via Apply / Enter so number-pad edits
  // don't refetch on every keystroke. Chips/selects apply live.
  const [appliedQuery, setAppliedQuery] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');

  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Listing[]>([]);

  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [
    activeCategory,
    txFilter,
    bedsFilter,
    selectedCity,
    sortBy,
    appliedQuery,
    appliedMinPrice,
    appliedMaxPrice,
  ]);

  const effectiveType: ListingType | undefined =
    txFilter === 'Sale'
      ? ListingType.SALE
      : txFilter === 'Rent'
        ? ListingType.RENT
        : activeCategory === 'sale'
          ? ListingType.SALE
          : activeCategory === 'rent'
            ? ListingType.RENT
            : undefined;

  const propertyTypes = resolvePropertyTypes(activeCategory);
  const { sortField, sortOrder } = sortToFields(sortBy);

  const queryParams: FlatSearchParams = {
    q: appliedQuery || undefined,
    type: effectiveType,
    propertyTypes,
    city: selectedCity || undefined,
    minPrice: appliedMinPrice ? Number(appliedMinPrice) : undefined,
    maxPrice: appliedMaxPrice ? Number(appliedMaxPrice) : undefined,
    minBedrooms: bedsFilter !== 'Any' ? parseInt(bedsFilter, 10) : undefined,
    sortField,
    sortOrder,
    page,
    limit: 12,
  };

  const listingsQuery = useQuery({
    queryKey: ['home-listings', queryParams],
    queryFn: () => searchApi.listings(queryParams),
    staleTime: 30_000,
  });

  useEffect(() => {
    const incoming = listingsQuery.data?.data;
    if (!incoming) return;
    setAccumulated((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
  }, [listingsQuery.data, page]);

  const totalCount = listingsQuery.data?.meta.total ?? 0;
  const hasMore =
    listingsQuery.data && page * 12 < (listingsQuery.data.meta.total ?? 0);

  // ----- handlers ----------------------------------------------------
  const handleSearch = () => setAppliedQuery(searchQuery.trim());

  const applyFilters = () => {
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
  };

  const clearFilters = () => {
    setActiveCategory('');
    setTxFilter('All');
    setMinPrice('');
    setMaxPrice('');
    setBedsFilter('Any');
    setSelectedCity('');
    setSearchQuery('');
    setAppliedQuery('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
  };

  const handleQuickSearch = (item: QuickItem) => {
    if (item.city) {
      setSelectedCity(item.city);
      return;
    }
    if (item.type === ListingType.SALE) setTxFilter('Sale');
    else if (item.type === ListingType.RENT) setTxFilter('Rent');
    else setTxFilter('All');
    setActiveCategory(item.pt ?? '');
  };

  const handleCitySearch = (cityEn: string) => {
    setSelectedCity(cityEn);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  const loadMore = () => setPage((p) => p + 1);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <Box>
      <Helmet>
        <title>
          {t('app.name')} — {t('app.tagline')}
        </title>
        <meta name="description" content={t('app.tagline')} />
      </Helmet>

      {/* ============================== A — Compact search bar (purple) ============================== */}
      <Box sx={{ bgcolor: 'primary.main', py: 2.5, px: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          <Select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            size="small"
            displayEmpty
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              minWidth: 150,
              height: 44,
              flexBasis: { xs: '100%', md: 'auto' },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            }}
          >
            <MenuItem value="">{t('home.allCities')}</MenuItem>
            {CITIES_AR_EN.slice(0, 5).map((c) => (
              <MenuItem key={c.en} value={c.en}>
                {isAr ? c.ar : c.en}
              </MenuItem>
            ))}
          </Select>

          <TextField
            size="small"
            fullWidth
            placeholder={t('home.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              flex: 1,
              minWidth: { xs: '100%', md: 0 },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-root': { height: 44 },
            }}
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleSearch} size="small" aria-label="search">
                  <SearchIcon sx={{ color: 'primary.main' }} />
                </IconButton>
              ),
            }}
          />

          {user && (
            <Button
              variant="contained"
              onClick={() => navigate({ to: '/dashboard/listings/new' as never })}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: 'secondary.main',
                color: 'common.white',
                '&:hover': { bgcolor: 'secondary.dark' },
                height: 44,
                px: 2.5,
                borderRadius: 2,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                flexBasis: { xs: '100%', md: 'auto' },
              }}
            >
              {t('home.addListing')}
            </Button>
          )}
        </Box>
      </Box>

      {/* ============================== B — Category tabs ============================== */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: { xs: 64, md: 72 },
          zIndex: 99,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            px: 2,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.filter;
            return (
              <Box
                key={cat.filter || 'all'}
                onClick={() => setActiveCategory(cat.filter)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  py: 1.5,
                  px: 2.5,
                  cursor: 'pointer',
                  flexShrink: 0,
                  borderBottom: '3px solid',
                  borderBottomColor: active ? 'primary.main' : 'transparent',
                  color: active ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                  transition: 'all 0.15s',
                }}
              >
                <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{cat.icon}</Typography>
                <Typography variant="caption" fontWeight={600} mt={0.5} whiteSpace="nowrap">
                  {isAr ? cat.labelAr : cat.labelEn}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ============================== C — Quick filter chips ============================== */}
      <Box
        sx={{
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1.5,
          px: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ mr: 0.5 }}
          >
            {t('home.quickBrowse')}
          </Typography>
          {QUICK_BROWSE.map((item) => (
            <Chip
              key={item.en}
              label={isAr ? item.ar : item.en}
              size="small"
              variant="outlined"
              onClick={() => handleQuickSearch(item)}
              sx={{
                cursor: 'pointer',
                borderColor: 'primary.light',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  borderColor: 'primary.main',
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ============================== D — Two-column main ============================== */}
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: 2,
          py: 3,
          bgcolor: 'background.default',
        }}
      >
        <Grid container spacing={2.5}>
          {/* LEFT: Filters + Stats */}
          <Grid item xs={12} md={3}>
            <Box sx={{ position: { md: 'sticky' }, top: 130 }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography
                  fontWeight={700}
                  mb={2}
                  sx={{
                    pb: 1,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  }}
                >
                  {t('home.filters')}
                </Typography>

                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  display="block"
                  mb={1}
                >
                  {t('home.transaction')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {TX_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={isAr ? TX_LABEL_AR[opt] : opt}
                      size="small"
                      color={txFilter === opt ? 'primary' : 'default'}
                      onClick={() => setTxFilter(opt)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>

                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  display="block"
                  mb={1}
                >
                  {t('home.priceRange')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder={isAr ? 'من' : 'Min'}
                    type="number"
                    sx={{ flex: 1 }}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <TextField
                    size="small"
                    placeholder={isAr ? 'إلى' : 'Max'}
                    type="number"
                    sx={{ flex: 1 }}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </Box>

                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  display="block"
                  mb={1}
                >
                  {t('home.bedrooms')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                  {BED_OPTIONS.map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      size="small"
                      color={bedsFilter === b ? 'primary' : 'default'}
                      variant={bedsFilter === b ? 'filled' : 'outlined'}
                      onClick={() => setBedsFilter(b)}
                      sx={{ cursor: 'pointer', minWidth: 36 }}
                    />
                  ))}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={applyFilters}
                  color="primary"
                >
                  {t('home.applyFilters')}
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  size="small"
                  onClick={clearFilters}
                  sx={{ mt: 0.5 }}
                >
                  {t('home.clearFilters')}
                </Button>
              </Paper>

              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={900} color="primary.main">
                  {totalCount.toLocaleString(i18n.language)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('home.activeListings')}
                </Typography>
              </Paper>
            </Box>
          </Grid>

          {/* RIGHT: Sort bar + listings */}
          <Grid item xs={12} md={9}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                bgcolor: 'background.paper',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <Box component="span" fontWeight={700} color="primary.main">
                  {totalCount.toLocaleString(i18n.language)}
                </Box>{' '}
                {t('home.results')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select
                  size="small"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  sx={{ height: 32, minWidth: 140 }}
                >
                  <MenuItem value="newest">{t('home.newestSort')}</MenuItem>
                  <MenuItem value="price_asc">{t('home.priceLowSort')}</MenuItem>
                  <MenuItem value="price_desc">{t('home.priceHighSort')}</MenuItem>
                </Select>
              </Box>
            </Box>

            <Grid container spacing={1.5}>
              {listingsQuery.isLoading && accumulated.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Grid item xs={12} sm={6} lg={4} key={`sk-${i}`}>
                      <SkeletonCard />
                    </Grid>
                  ))
                : accumulated.map((listing) => (
                    <Grid item xs={12} sm={6} lg={4} key={listing.id}>
                      <ListingCard
                        listing={listing}
                        saved={savedIds.includes(listing.id)}
                        onToggleSave={toggleSaved}
                      />
                    </Grid>
                  ))}
            </Grid>

            {!listingsQuery.isLoading && accumulated.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography color="text.secondary">{t('empty.noResults')}</Typography>
              </Box>
            )}

            {hasMore && (
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={loadMore}
                  disabled={listingsQuery.isFetching}
                >
                  {t('home.loadMoreListings')}
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ============================== E — Compact city chips ============================== */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 2.5,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2 }}>
          <Typography fontWeight={700} mb={1.5}>
            {t('home.browseByCity')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CITIES_AR_EN.map((city) => (
              <Chip
                key={city.en}
                label={isAr ? city.ar : city.en}
                variant="outlined"
                onClick={() => handleCitySearch(city.en)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    borderColor: 'primary.main',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
