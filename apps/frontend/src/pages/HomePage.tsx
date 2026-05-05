import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationCityIcon from '@mui/icons-material/LocationCityOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ListingType, PropertyType } from '@aqarat/shared-types';

import { searchApi } from '@/api/search.api';
import { aiApi } from '@/api/ai.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

type SearchTab = 'buy' | 'rent' | 'commercial';

// City quick-pick chips — matches Aqar.com top 5
const CITY_CHIPS: Array<{ en: string; ar: string }> = [
  { en: 'Riyadh', ar: 'الرياض' },
  { en: 'Jeddah', ar: 'جدة' },
  { en: 'Dammam', ar: 'الدمام' },
  { en: 'Mecca', ar: 'مكة المكرمة' },
  { en: 'Medina', ar: 'المدينة المنورة' },
];

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function HomePage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const savedIds = useSavedStore((s) => s.ids);
  const toggleSaved = useSavedStore((s) => s.toggle);

  // ----- featured listings -------------------------------------------
  const featuredQuery = useQuery({
    queryKey: ['search', 'featured-home'],
    queryFn: () => searchApi.listings({ isFeatured: true, limit: 8, sortField: 'createdAt' }),
    staleTime: 60_000,
  });

  // ----- recommendations (auth only) ---------------------------------
  const recCandidatesQuery = useQuery({
    queryKey: ['search', 'rec-candidates'],
    queryFn: () => searchApi.listings({ limit: 12, sortField: 'createdAt' }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const candidateIds = (recCandidatesQuery.data?.data ?? []).map((l) => l.id);
  const recsQuery = useQuery({
    queryKey: ['ai', 'recs', candidateIds],
    queryFn: () => aiApi.recommendations(candidateIds, []),
    enabled: isAuthenticated && candidateIds.length > 0,
    staleTime: 5 * 60_000,
  });
  const recommendedListings = (recsQuery.data ?? [])
    .map((s) => recCandidatesQuery.data?.data.find((l) => l.id === s.listingId))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 4);

  // ----- search form --------------------------------------------------
  const [searchTab, setSearchTab] = useState<SearchTab>('buy');
  const [searchQ, setSearchQ] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState<string>('');
  const [searchBedrooms, setSearchBedrooms] = useState<string>('');

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const search: Record<string, string | number> = {};
    if (searchTab === 'buy') search.type = ListingType.SALE;
    if (searchTab === 'rent') search.type = ListingType.RENT;
    if (searchTab === 'commercial') {
      search.propertyTypes = `${PropertyType.OFFICE},${PropertyType.COMMERCIAL}`;
    }
    if (searchQ.trim()) search.q = searchQ.trim();
    if (searchCity.trim()) search.city = searchCity.trim();
    if (searchMaxPrice) search.maxPrice = Number(searchMaxPrice);
    if (searchBedrooms) search.minBedrooms = Number(searchBedrooms);
    void navigate({ to: '/search' as never, search: search as never });
  };

  const goToCity = (city: string) =>
    void navigate({ to: '/search' as never, search: { city } as never });

  return (
    <Box>
      <Helmet>
        <title>{t('app.name')} — {t('app.tagline')}</title>
        <meta name="description" content={t('app.tagline')} />
      </Helmet>

      {/* ============================== HERO ============================== */}
      <Box
        sx={{
          position: 'relative',
          color: 'common.white',
          // Dark midnight base + lavender gradient accent + subtle photo overlay
          background: `linear-gradient(135deg, ${alpha('#1A1A2E', 0.92)} 0%, ${alpha('#1A1A2E', 0.86)} 55%, ${alpha('#4A4080', 0.75)} 100%), url(https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2000&q=80)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          py: { xs: 7, md: 11 },
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -160,
            insetInlineEnd: -160,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#9B94C9', 0.35)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3.4rem' },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                mb: 1.5,
              }}
            >
              {t('home.heroTitle')}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                opacity: 0.9,
                fontWeight: 400,
                mb: { xs: 3, md: 4 },
                fontSize: { xs: '0.95rem', md: '1.1rem' },
              }}
            >
              {t('home.heroSubtitle')}
            </Typography>
          </motion.div>

          {/* ----- Property type tabs (Buy | Rent | Commercial) ----- */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Tabs
              value={searchTab}
              onChange={(_, v: SearchTab) => setSearchTab(v)}
              textColor="inherit"
              TabIndicatorProps={{ sx: { display: 'none' } }}
              sx={{
                minHeight: 'auto',
                '& .MuiTabs-flexContainer': {
                  bgcolor: alpha('#FFFFFF', 0.1),
                  borderRadius: 999,
                  p: 0.5,
                  backdropFilter: 'blur(10px)',
                },
                '& .MuiTab-root': {
                  minHeight: 38,
                  px: { xs: 2.5, sm: 4 },
                  py: 1,
                  fontWeight: 700,
                  fontSize: 14,
                  color: alpha('#FFFFFF', 0.75),
                  borderRadius: 999,
                  transition: 'all 200ms ease',
                  '&.Mui-selected': {
                    color: 'primary.dark',
                    bgcolor: 'common.white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  },
                },
              }}
            >
              <Tab value="buy" label={t('home.tabBuy')} />
              <Tab value="rent" label={t('home.tabRent')} />
              <Tab value="commercial" label={t('home.tabCommercial')} />
            </Tabs>
          </Box>

          {/* ----- Centered search bar ----- */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
          >
            <Box
              component="form"
              onSubmit={onSearch}
              sx={{
                bgcolor: 'common.white',
                borderRadius: { xs: 3, md: 999 },
                p: { xs: 1.5, md: 1 },
                pl: { xs: 1.5, md: 3 },
                boxShadow: '0 20px 50px rgba(26,26,46,0.4)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1, md: 0 },
                alignItems: 'stretch',
                maxWidth: 880,
                mx: 'auto',
              }}
            >
              <TextField
                placeholder={t('home.searchPlaceholder')}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 15, color: 'text.primary' },
                }}
                sx={{
                  flex: { md: 1.4 },
                  px: { xs: 1, md: 0 },
                  py: { xs: 0.5, md: 0 },
                }}
              />
              <Box
                sx={{
                  width: { xs: '100%', md: 1 },
                  height: { xs: 1, md: 28 },
                  bgcolor: 'divider',
                  alignSelf: 'center',
                  display: { xs: 'none', md: 'block' },
                }}
              />
              <TextField
                placeholder={t('search.city')}
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: 15, color: 'text.primary' },
                }}
                sx={{ flex: { md: 0.9 }, px: { xs: 1, md: 1.75 }, py: { xs: 0.5, md: 0 } }}
              />
              <Box
                sx={{
                  width: { xs: '100%', md: 1 },
                  height: { xs: 1, md: 28 },
                  bgcolor: 'divider',
                  alignSelf: 'center',
                  display: { xs: 'none', md: 'block' },
                }}
              />
              <TextField
                select
                value={searchBedrooms}
                onChange={(e) => setSearchBedrooms(e.target.value)}
                variant="standard"
                SelectProps={{ displayEmpty: true, IconComponent: () => null }}
                InputProps={{ disableUnderline: true, sx: { fontSize: 14, color: 'text.primary' } }}
                sx={{ flex: { md: 0.6 }, px: { xs: 1, md: 1.75 }, py: { xs: 0.5, md: 0 } }}
              >
                <MenuItem value="">{t('search.minBedrooms')}</MenuItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={String(n)}>{n}+</MenuItem>
                ))}
              </TextField>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                sx={{
                  borderRadius: 999,
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.25, md: 1.4 },
                  fontWeight: 700,
                  fontSize: 15,
                  background: theme.aqarat.gradient,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                {t('home.searchCta')}
              </Button>
            </Box>
          </motion.div>

          {/* ----- City quick chips ----- */}
          <Stack
            direction="row"
            spacing={1.25}
            justifyContent="center"
            useFlexGap
            sx={{
              mt: 3,
              flexWrap: 'wrap',
              rowGap: 1,
            }}
          >
            {CITY_CHIPS.map((c) => {
              const label = i18n.language === 'ar' ? c.ar : c.en;
              return (
                <Chip
                  key={c.en}
                  icon={<LocationCityIcon sx={{ fontSize: 16, color: 'inherit !important' }} />}
                  label={label}
                  onClick={() => goToCity(c.en)}
                  sx={{
                    bgcolor: alpha('#FFFFFF', 0.12),
                    color: 'common.white',
                    border: `1px solid ${alpha('#FFFFFF', 0.22)}`,
                    fontWeight: 600,
                    fontSize: 13,
                    height: 32,
                    px: 0.5,
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                    '&:hover': {
                      bgcolor: alpha('#FFFFFF', 0.22),
                      borderColor: alpha('#FFFFFF', 0.4),
                    },
                  }}
                />
              );
            })}
          </Stack>
        </Container>
      </Box>

      {/* ============================== STATS (compact) ============================== */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 3.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <VerifiedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {t('home.trustedBy')}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={4} md={3}>
              <StatBlock label={t('search.results')} value={10000} suffix="+" />
            </Grid>
            <Grid item xs={4} md={3}>
              <StatBlock label={t('nav.agents')} value={500} suffix="+" />
            </Grid>
            <Grid item xs={4} md={3}>
              <StatBlock label={t('home.popularCities')} value={12} suffix="+" />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================== FEATURED LISTINGS GRID ============================== */}
      <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 } }}>
        <SectionHeader
          title={t('home.featuredListings')}
          actionLabel={t('home.viewMore')}
          onAction={() =>
            void navigate({ to: '/search' as never, search: { isFeatured: true } as never })
          }
        />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {featuredQuery.isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Grid key={i} item xs={12} sm={6} md={4} lg={3}>
                  <SkeletonCard />
                </Grid>
              ))
            : (featuredQuery.data?.data ?? []).slice(0, 8).map((listing) => (
                <Grid key={listing.id} item xs={12} sm={6} md={4} lg={3}>
                  <ListingCard
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    onToggleSave={toggleSaved}
                  />
                </Grid>
              ))}
        </Grid>
      </Container>

      {/* ============================== RECOMMENDATIONS (auth only) ============================== */}
      {isAuthenticated && recommendedListings.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 } }}>
          <SectionHeader title={t('search.popular')} />
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {recommendedListings.map((listing) => (
              <Grid key={listing.id} item xs={12} sm={6} md={4} lg={3}>
                <ListingCard
                  listing={listing}
                  saved={savedIds.includes(listing.id)}
                  onToggleSave={toggleSaved}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      {/* ============================== CITY SPOTLIGHT ============================== */}
      <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 } }}>
        <SectionHeader title={t('home.popularCities')} />
        <Grid container spacing={2.5}>
          {CITY_CHIPS.slice(0, 5).map((c) => {
            const label = i18n.language === 'ar' ? c.ar : c.en;
            return (
              <Grid key={c.en} item xs={6} sm={4} md={2.4}>
                <Box
                  onClick={() => goToCity(c.en)}
                  sx={{
                    position: 'relative',
                    aspectRatio: '4 / 5',
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: 1,
                    borderColor: 'divider',
                    transition: 'transform 250ms ease, box-shadow 250ms ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.18)}`,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(180deg, transparent 40%, ${alpha('#1A1A2E', 0.85)} 100%)`,
                      zIndex: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={`https://picsum.photos/seed/${c.en}/600/750`}
                    alt={label}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 600ms ease',
                      '*:hover > &': { transform: 'scale(1.06)' },
                    }}
                    loading="lazy"
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      insetInline: 0,
                      p: 1.5,
                      color: 'common.white',
                      zIndex: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {t('home.popularInCity')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* ============================== FEATURED AGENTS ============================== */}
      <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 6, md: 8 } }}>
        <SectionHeader title={t('nav.agents')} />
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} item xs={6} sm={4} md={2}>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.12)}`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: theme.aqarat.gradient,
                    color: 'common.white',
                    fontSize: 22,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1.25,
                  }}
                >
                  {String.fromCharCode(65 + (i % 26))}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                  Agent {i + 1}
                </Typography>
                <Stack direction="row" spacing={0.25} justifyContent="center" sx={{ mb: 0.5 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} sx={{ color: theme.aqarat.gold, fontSize: 13 }} />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {(i % 24) + 6} {t('search.results')}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          endIcon={<ArrowForwardIcon sx={{ transform: 'var(--rtl-flip, none)' }} />}
          sx={{ fontWeight: 700, color: 'primary.dark' }}
        >
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}

function StatBlock({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.5, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, motionValue, rounded]);

  return (
    <Box ref={ref}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, color: 'primary.dark', lineHeight: 1.1, mb: 0.25 }}
      >
        {display.toLocaleString()}
        {suffix}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}
      >
        {label}
      </Typography>
    </Box>
  );
}

