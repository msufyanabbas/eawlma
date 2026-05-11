import {
  Box,
  Container,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { priceTrendsApi } from '@/api/priceTrends.api';

const CITIES = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar'];
// Keys must mirror entries under the `propertyTypes` i18n namespace.
const PROPERTY_TYPES = ['apartment', 'villa', 'office', 'land', 'studio'] as const;

export function MarketPage() {
  const { t, i18n } = useTranslation();
  const [city, setCity] = useState('Riyadh');
  const [type, setType] = useState<(typeof PROPERTY_TYPES)[number]>('apartment');

  const trendsQuery = useQuery({
    queryKey: ['priceTrends', city, type],
    queryFn: () => priceTrendsApi.trends(city, type),
  });
  const areaQuery = useQuery({
    queryKey: ['priceTrends', 'area', city],
    queryFn: () => priceTrendsApi.areaInsights(city),
  });

  const fmt = (n: number) =>
    Math.round(n).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : i18n.language);

  // Aggregate stats — only shown when we actually have trend data, otherwise
  // the cards would show 0/NaN and look broken.
  const stats = useMemo(() => {
    const data = trendsQuery.data;
    if (!data || data.length === 0) return null;
    const avgPrice =
      data.reduce((sum, p) => sum + Number(p.avgPrice ?? 0), 0) / data.length;
    const avgPpsm =
      data.reduce((sum, p) => sum + Number(p.avgPricePerSqm ?? 0), 0) / data.length;
    const totalListings = data.reduce((sum, p) => sum + Number(p.listingCount ?? 0), 0);
    return { avgPrice, avgPpsm, totalListings };
  }, [trendsQuery.data]);

  const trendsLoading = trendsQuery.isLoading;
  const areaLoading = areaQuery.isLoading;
  const trendsHasData = !!trendsQuery.data && trendsQuery.data.length > 0;
  const areaHasData = !!areaQuery.data && areaQuery.data.length > 0;
  const isEmpty = !trendsLoading && !areaLoading && !trendsHasData && !areaHasData;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Helmet>
        <title>{t('market.title')} — {t('app.name')}</title>
      </Helmet>

      {/* Compact purple header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.75 }}>
            📊 {t('market.title')}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85 }}>
            {t('market.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Container
        maxWidth={false}
        sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 4, md: 6 } }}
      >
        {/* Filter bar */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 4,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'text.secondary',
                fontWeight: 700,
                minWidth: 80,
              }}
            >
              {t('market.filters')}
            </Typography>
            <TextField
              select
              size="small"
              label={t('market.city')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              sx={{ minWidth: 200, flex: { sm: 1 } }}
            >
              {CITIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('market.propertyType')}
              value={type}
              onChange={(e) => setType(e.target.value as (typeof PROPERTY_TYPES)[number])}
              sx={{ minWidth: 200, flex: { sm: 1 } }}
            >
              {PROPERTY_TYPES.map((pt) => (
                <MenuItem key={pt} value={pt}>{t(`propertyTypes.${pt}`)}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>

        {/* Empty state — only when both queries returned nothing. */}
        {isEmpty && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t('market.emptyTitle')}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              {t('market.emptyBody')}
            </Typography>
          </Paper>
        )}

        {/* Summary stats — only when we have trend data. */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <StatCard
                label={t('market.avgPrice')}
                value={`${fmt(stats.avgPrice)} SAR`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label={t('market.avgPricePerSqm')}
                value={`${fmt(stats.avgPpsm)} SAR/m²`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label={t('market.totalListings')}
                value={fmt(stats.totalListings)}
              />
            </Grid>
          </Grid>
        )}

        {/* Trend chart — only render when there's something to plot. */}
        {(trendsLoading || trendsHasData) && (
          <Paper
            elevation={0}
            sx={{ p: { xs: 2, md: 3 }, mb: 4, border: 1, borderColor: 'divider', borderRadius: 3 }}
          >
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 0.5 }}>
              {t('market.priceTrend')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('market.priceTrendSubtitle')}
            </Typography>
            {trendsLoading ? (
              <Skeleton variant="rectangular" height={320} />
            ) : (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={trendsQuery.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => fmt(Number(v))} />
                    <RechartsTooltip
                      formatter={(v: number) => [`${fmt(v)} SAR/m²`, t('market.avgPricePerSqm')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPricePerSqm"
                      stroke="#6C63A6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        )}

        {/* Area / district insights — only render when there's something. */}
        {(areaLoading || areaHasData) && (
          <Paper
            elevation={0}
            sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}
          >
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 0.5 }}>
              {t('market.areaInsights')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('market.areaInsightsSubtitle')}
            </Typography>
            {areaLoading ? (
              <Skeleton variant="rectangular" height={320} />
            ) : (
              <Box sx={{ width: '100%', height: 360 }}>
                <ResponsiveContainer>
                  <BarChart data={areaQuery.data} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => fmt(Number(v))} />
                    <YAxis type="category" dataKey="district" width={140} />
                    <RechartsTooltip
                      formatter={(v: number) => [`${fmt(v)} SAR/m²`, t('market.avgPricePerSqm')]}
                    />
                    <Bar dataKey="avgPricePerSqm" fill="#6C63A6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        height: '100%',
      }}
    >
      <Typography
        variant="caption"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: '1.5rem', fontWeight: 800 }}>
        {value}
      </Typography>
    </Paper>
  );
}
