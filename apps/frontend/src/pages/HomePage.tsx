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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ListingType, PropertyType } from '@eawlma/shared-types';

import { searchApi } from '@/api/search.api';
import { aiApi } from '@/api/ai.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { Reveal } from '@/components/global/Reveal';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

type SearchTab = 'buy' | 'rent' | 'commercial';

// Hand-picked Unsplash hero image — luxury Saudi/Gulf villa exterior.
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80';

// Mirror of the seed.ts agent roster — used to render realistic Saudi agent
// profiles on the home page in both Arabic and English. When the backend
// exposes a featured-agents endpoint, replace this with a live query.
const FEATURED_AGENTS: Array<{
  email: string;
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  activeListings: number;
}> = [
  { email: 'agent1@eawlma.sa', firstName: 'Mohammed', lastName: 'Al-Otaibi',   firstNameAr: 'محمد',    lastNameAr: 'العتيبي',  activeListings: 12 },
  { email: 'agent2@eawlma.sa', firstName: 'Faisal',   lastName: 'Al-Shammari', firstNameAr: 'فيصل',    lastNameAr: 'الشمري',   activeListings: 9 },
  { email: 'agent3@eawlma.sa', firstName: 'Abdullah', lastName: 'Al-Qahtani',  firstNameAr: 'عبدالله', lastNameAr: 'القحطاني', activeListings: 14 },
  { email: 'agent4@eawlma.sa', firstName: 'Sara',     lastName: 'Al-Maliki',   firstNameAr: 'سارة',    lastNameAr: 'المالكي',  activeListings: 7 },
  { email: 'agent5@eawlma.sa', firstName: 'Khalid',   lastName: 'Al-Dosari',   firstNameAr: 'خالد',    lastNameAr: 'الدوسري',  activeListings: 11 },
  { email: 'agent6@eawlma.sa', firstName: 'Noura',    lastName: 'Al-Subaie',   firstNameAr: 'نورة',    lastNameAr: 'السبيعي',  activeListings: 8 },
];

// City quick-pick chips with curated Unsplash imagery per city.
const CITY_CHIPS: Array<{ en: string; ar: string; image: string }> = [
  {
    en: 'Riyadh',
    ar: 'الرياض',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800&q=80',
  },
  {
    en: 'Jeddah',
    ar: 'جدة',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
  },
  {
    en: 'Dammam',
    ar: 'الدمام',
    image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=800&q=80',
  },
  {
    en: 'Mecca',
    ar: 'مكة المكرمة',
    image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80',
  },
  {
    en: 'Medina',
    ar: 'المدينة المنورة',
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80',
  },
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

  // ----- per-city listing counts (used by the city spotlight cards) ---
  // Single page, limit=1 — we only want the meta.total. Cheap query, cached.
  const cityCountQueries = useQueries({
    queries: CITY_CHIPS.map((c) => ({
      queryKey: ['search', 'city-count', c.en],
      queryFn: () => searchApi.listings({ city: c.en, limit: 1 }),
      staleTime: 5 * 60_000,
    })),
  });

  // ----- featured listings -------------------------------------------
  const featuredQuery = useQuery({
    queryKey: ['search', 'featured-home'],
    queryFn: () => searchApi.listings({ isFeatured: true, limit: 8, sortField: 'createdAt' }),
    staleTime: 60_000,
  });

  // Fallback newest listings — used to top up the featured grid when fewer
  // than 4 listings are flagged as featured (so the grid always feels full).
  const FEATURED_MIN = 4;
  const needFallback = !featuredQuery.isLoading && (featuredQuery.data?.data.length ?? 0) < FEATURED_MIN;
  const fallbackQuery = useQuery({
    queryKey: ['search', 'home-fallback'],
    queryFn: () => searchApi.listings({ limit: 8, sortField: 'createdAt' }),
    enabled: needFallback,
    staleTime: 60_000,
  });

  const featuredListings = useMemo(() => {
    const featured = featuredQuery.data?.data ?? [];
    if (featured.length >= FEATURED_MIN) return featured.slice(0, 8);
    const fallback = fallbackQuery.data?.data ?? [];
    const seen = new Set(featured.map((l) => l.id));
    const padded = [...featured];
    for (const l of fallback) {
      if (padded.length >= 8) break;
      if (!seen.has(l.id)) padded.push(l);
    }
    return padded;
  }, [featuredQuery.data, fallbackQuery.data]);

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
          // Dark midnight base + lavender gradient accent + luxury villa photo
          background: `linear-gradient(135deg, ${alpha('#1A1A2E', 0.85)} 0%, ${alpha('#1A1A2E', 0.72)} 55%, ${alpha('#4A4080', 0.68)} 100%), url(${HERO_IMAGE_URL})`,
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
                // Outer glass shell — slight lavender tint shows through on the hero
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: { xs: 3, md: 999 },
                // Inner pill panel of 90% white with the three inputs + button
                p: { xs: 1, md: 0.75 },
                boxShadow: '0 20px 50px rgba(26,26,46,0.4)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1, md: 0 },
                alignItems: 'stretch',
                maxWidth: 880,
                mx: 'auto',
                '& > .inner-pill': {
                  flex: 1,
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: 'stretch',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: { xs: 2.5, md: 999 },
                  pl: { xs: 1.25, md: 2.5 },
                  pr: { xs: 1.25, md: 0.5 },
                  py: { xs: 0.5, md: 0.25 },
                },
              }}
            >
              <Box className="inner-pill">
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
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                sx={{
                  borderRadius: 999,
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.25, md: 1.4 },
                  ml: { md: 0.75 },
                  fontWeight: 700,
                  fontSize: 15,
                  background: theme.eawlma.gradient,
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
      <Reveal>
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
      </Reveal>

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
            : featuredListings.map((listing, i) => (
                <Grid key={listing.id} item xs={12} sm={6} md={4} lg={3}>
                  <Reveal delay={i * 0.08}>
                    <ListingCard
                      listing={listing}
                      saved={savedIds.includes(listing.id)}
                      onToggleSave={toggleSaved}
                    />
                  </Reveal>
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
          {CITY_CHIPS.slice(0, 5).map((c, idx) => {
            const label = i18n.language === 'ar' ? c.ar : c.en;
            const cityCount = cityCountQueries[idx]?.data?.meta.total;
            return (
              <Grid key={c.en} item xs={6} sm={4} md={2.4}>
                <Reveal delay={idx * 0.07}>
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
                    src={c.image}
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
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                      {typeof cityCount === 'number' && cityCount > 0
                        ? `${cityCount.toLocaleString(i18n.language)} ${t('search.results')}`
                        : `${t('home.viewMore')} →`}
                    </Typography>
                  </Box>
                </Box>
                </Reveal>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* ============================== FEATURED AGENTS ============================== */}
      <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 6, md: 8 } }}>
        <SectionHeader title={t('nav.agents')} />
        <Grid container spacing={2}>
          {FEATURED_AGENTS.map((a, idx) => {
            const displayName = i18n.language === 'ar'
              ? `${a.firstNameAr} ${a.lastNameAr}`
              : `${a.firstName} ${a.lastName}`;
            const initials = `${a.firstName[0]}${a.lastName.replace(/^Al-/, '')[0] ?? ''}`.toUpperCase();
            return (
              <Grid key={a.email} item xs={6} sm={4} md={2}>
                <Reveal variant="scaleIn" delay={idx * 0.06}>
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
                      background: theme.eawlma.gradient,
                      color: 'common.white',
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.25,
                    }}
                  >
                    {initials}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25, lineHeight: 1.25 }}>
                    {displayName}
                  </Typography>
                  <Stack direction="row" spacing={0.25} justifyContent="center" sx={{ mb: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarIcon key={n} sx={{ color: theme.eawlma.gold, fontSize: 13 }} />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {a.activeListings}+ {t('search.results')}
                  </Typography>
                </Box>
                </Reveal>
              </Grid>
            );
          })}
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
    <Box
      ref={ref}
      sx={{
        // Glass tile — subtle lavender wash with a hairline border
        bgcolor: 'rgba(108,99,166,0.08)',
        border: '1px solid rgba(108,99,166,0.15)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
      }}
    >
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

