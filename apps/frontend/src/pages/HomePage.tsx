import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import VillaIcon from '@mui/icons-material/Villa';
import OfficeIcon from '@mui/icons-material/CorporateFare';
import LandIcon from '@mui/icons-material/Terrain';
import StoreIcon from '@mui/icons-material/Storefront';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StarIcon from '@mui/icons-material/Star';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
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

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
];

const PROPERTY_TYPE_CHIPS: Array<{ key: PropertyType; icon: ReactNode; labelKey: string }> = [
  { key: PropertyType.APARTMENT, icon: <ApartmentIcon />, labelKey: 'apartment' },
  { key: PropertyType.VILLA, icon: <VillaIcon />, labelKey: 'villa' },
  { key: PropertyType.OFFICE, icon: <OfficeIcon />, labelKey: 'office' },
  { key: PropertyType.LAND, icon: <LandIcon />, labelKey: 'land' },
  { key: PropertyType.COMMERCIAL, icon: <StoreIcon />, labelKey: 'commercial' },
];

const CITY_SPOTLIGHT = [
  {
    nameAr: 'الرياض',
    nameEn: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1577147443647-81856d5151af?auto=format&fit=crop&w=1200&q=80',
  },
  {
    nameAr: 'جدة',
    nameEn: 'Jeddah',
    image: 'https://images.unsplash.com/photo-1601651128268-d5a9b3a0d8a9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    nameAr: 'الدمام',
    nameEn: 'Dammam',
    image: 'https://images.unsplash.com/photo-1542295669297-4d352b042bca?auto=format&fit=crop&w=1200&q=80',
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

  // ----- hero carousel ------------------------------------------------
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(id);
  }, []);

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
  const [searchType, setSearchType] = useState<ListingType | ''>('');
  const [searchCity, setSearchCity] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState<string>('');
  const [searchBedrooms, setSearchBedrooms] = useState<string>('');

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const search: Record<string, string | number> = {};
    if (searchType) search.type = searchType;
    if (searchCity.trim()) search.city = searchCity.trim();
    if (searchMaxPrice) search.maxPrice = Number(searchMaxPrice);
    if (searchBedrooms) search.minBedrooms = Number(searchBedrooms);
    void navigate({ to: '/search' as never, search: search as never });
  };

  return (
    <Box>
      <Helmet>
        <title>{t('app.name')} — {t('app.tagline')}</title>
        <meta name="description" content={t('app.tagline')} />
      </Helmet>

      {/* ---------------- HERO ---------------- */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 640, md: 720 },
          overflow: 'hidden',
          color: 'common.white',
        }}
      >
        {/* Crossfading background images */}
        {HERO_IMAGES.map((src, i) => (
          <Box
            key={src}
            component={motion.div}
            initial={false}
            animate={{ opacity: i === heroIdx ? 1 : 0, scale: i === heroIdx ? 1.04 : 1 }}
            transition={{ opacity: { duration: 1.4 }, scale: { duration: 8, ease: 'linear' } }}
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(120deg, rgba(15,23,42,0.65), rgba(15,23,42,0.45)), url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}

        {/* Hero content */}
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.25rem', md: '3.75rem' },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                maxWidth: 760,
                mb: 1.5,
              }}
            >
              {t('home.heroTitle')}
            </Typography>
            <Typography
              variant="h6"
              sx={{ opacity: 0.92, fontWeight: 400, maxWidth: 620, mb: 4 }}
            >
              {t('home.heroSubtitle')}
            </Typography>
          </motion.div>

          {/* Glassmorphism search bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <Box
              component="form"
              onSubmit={onSearch}
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 4,
                backgroundColor: alpha('#FFFFFF', 0.16),
                backdropFilter: 'blur(18px) saturate(150%)',
                WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 30px 60px rgba(15,23,42,0.32)',
                maxWidth: 980,
              }}
            >
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} md={2.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('search.type')}
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as ListingType | '')}
                    sx={glassFieldSx}
                  >
                    <MenuItem value="">{t('common.viewAll')}</MenuItem>
                    <MenuItem value={ListingType.SALE}>{t('listing.forSale')}</MenuItem>
                    <MenuItem value={ListingType.RENT}>{t('listing.forRent')}</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('search.city')}
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    sx={glassFieldSx}
                  />
                </Grid>
                <Grid item xs={6} md={2.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t('search.maxPrice')}
                    value={searchMaxPrice}
                    onChange={(e) => setSearchMaxPrice(e.target.value)}
                    sx={glassFieldSx}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('search.minBedrooms')}
                    value={searchBedrooms}
                    onChange={(e) => setSearchBedrooms(e.target.value)}
                    sx={glassFieldSx}
                  >
                    <MenuItem value="">—</MenuItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={String(n)}>{n}+</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    variant="contained"
                    color="secondary"
                    startIcon={<SearchIcon />}
                    sx={{ height: 40 }}
                  >
                    {t('home.searchCta')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ---------------- PROPERTY TYPE QUICK CHIPS ---------------- */}
      <Container maxWidth="lg" sx={{ mt: { xs: -3, md: -4 }, position: 'relative', zIndex: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            pt: 0.5,
          }}
          className="scrollbar-hide"
        >
          {PROPERTY_TYPE_CHIPS.map((p) => (
            <Chip
              key={p.key}
              icon={p.icon as React.ReactElement}
              label={i18n.language === 'ar' ? arabicPropertyType(p.key) : englishPropertyType(p.key)}
              onClick={() =>
                navigate({ to: '/search' as never, search: { propertyTypes: p.key } as never })
              }
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                px: 1.5,
                height: 44,
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' },
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      </Container>

      {/* ---------------- FEATURED LISTINGS ---------------- */}
      <Section title={t('home.featuredListings')}>
        <HorizontalScroller>
          {featuredQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={cardWrapperSx}>
                  <SkeletonCard />
                </Box>
              ))
            : (featuredQuery.data?.data ?? []).map((listing) => (
                <Box key={listing.id} sx={cardWrapperSx}>
                  <ListingCard
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    onToggleSave={toggleSaved}
                  />
                </Box>
              ))}
        </HorizontalScroller>
      </Section>

      {/* ---------------- RECOMMENDATIONS (auth only) ---------------- */}
      {isAuthenticated && recommendedListings.length > 0 && (
        <Section title={`${t('home.featuredListings')} — ${t('search.popular')}`}>
          <Grid container spacing={3}>
            {recommendedListings.map((listing) => (
              <Grid key={listing.id} item xs={12} sm={6} md={3}>
                <ListingCard
                  listing={listing}
                  saved={savedIds.includes(listing.id)}
                  onToggleSave={toggleSaved}
                />
              </Grid>
            ))}
          </Grid>
        </Section>
      )}

      {/* ---------------- ANIMATED STATS ---------------- */}
      <Box sx={{ bgcolor: theme.aqarat.hero, color: 'common.white', py: { xs: 6, md: 10 }, mt: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <StatBlock label={t('search.results')} value={10000} suffix="+" />
            <StatBlock label={t('common.language')} value={30} suffix="+" />
            <StatBlock label={t('nav.agents')} value={500} suffix="+" />
            <StatBlock label={t('home.popularCities')} value={12} suffix="+" />
          </Grid>
        </Container>
      </Box>

      {/* ---------------- CITY SPOTLIGHT ---------------- */}
      <Section title={t('home.popularCities')}>
        <Grid container spacing={3}>
          {CITY_SPOTLIGHT.map((c) => {
            const name = i18n.language === 'ar' ? c.nameAr : c.nameEn;
            return (
              <Grid key={c.nameEn} item xs={12} sm={4}>
                <Box
                  onClick={() =>
                    navigate({ to: '/search' as never, search: { city: c.nameEn } as never })
                  }
                  sx={{
                    position: 'relative',
                    aspectRatio: '4 / 5',
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: 4,
                    '& img': { transition: 'transform 600ms ease' },
                    '&:hover img': { transform: 'scale(1.08)' },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.85) 100%)',
                    },
                  }}
                >
                  <img
                    src={c.image}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      insetInline: 0,
                      p: 3,
                      color: 'common.white',
                      zIndex: 2,
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      {t('home.exploreSale')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Section>

      {/* ---------------- FEATURED AGENTS ---------------- */}
      <Section title={t('nav.agents')}>
        <HorizontalScroller>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                ...cardWrapperSx,
                width: { xs: 240, sm: 260 },
              }}
            >
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  transition: 'transform 200ms ease',
                  '&:hover': { transform: 'translateY(-3px)' },
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: 28,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {String.fromCharCode(65 + (i % 26))}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Aqarat Agent {i + 1}
                </Typography>
                <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 0.5, mb: 1 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} sx={{ color: 'warning.main', fontSize: 16 }} />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {(i % 24) + 6} {t('search.results')}
                </Typography>
              </Box>
            </Box>
          ))}
        </HorizontalScroller>
      </Section>

      <Box sx={{ height: 64 }} />
    </Box>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const glassFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.92)',
    color: 'text.primary',
    '& fieldset': { borderColor: 'rgba(255,255,255,0)' },
    '&:hover fieldset': { borderColor: 'primary.light' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
};

const cardWrapperSx = {
  flex: '0 0 auto',
  width: { xs: 280, sm: 300, md: 320 },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
      <Box
        ref={ref}
        component={motion.div}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Container>
  );
}

function HorizontalScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scroll = (delta: number) => {
    if (ref.current) ref.current.scrollBy({ left: delta, behavior: 'smooth' });
  };
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={ref}
        className="scrollbar-hide"
        sx={{ display: 'flex', gap: 3, overflowX: 'auto', scrollSnapType: 'x mandatory', pb: 1 }}
      >
        {children}
      </Box>
      <IconButton
        onClick={() => scroll(-340)}
        sx={{
          position: 'absolute',
          insetInlineStart: -8,
          top: '40%',
          bgcolor: 'background.paper',
          boxShadow: 2,
          display: { xs: 'none', md: 'inline-flex' },
        }}
        aria-label="scroll left"
      >
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        onClick={() => scroll(340)}
        sx={{
          position: 'absolute',
          insetInlineEnd: -8,
          top: '40%',
          bgcolor: 'background.paper',
          boxShadow: 2,
          display: { xs: 'none', md: 'inline-flex' },
        }}
        aria-label="scroll right"
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
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
    <Grid item xs={6} md={3} ref={ref}>
      <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
        {display.toLocaleString()}
        {suffix}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Grid>
  );
}

function arabicPropertyType(t: PropertyType): string {
  switch (t) {
    case PropertyType.APARTMENT: return 'شقة';
    case PropertyType.VILLA: return 'فيلا';
    case PropertyType.OFFICE: return 'مكتب';
    case PropertyType.LAND: return 'أرض';
    case PropertyType.COMMERCIAL: return 'تجاري';
    default: return t;
  }
}
function englishPropertyType(t: PropertyType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
