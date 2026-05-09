import {
  Box,
  Container,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
const TYPES = ['apartment', 'villa', 'office', 'land', 'studio'];

export function MarketPage() {
  const { t, i18n } = useTranslation();
  const [city, setCity] = useState('Riyadh');
  const [type, setType] = useState('apartment');

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

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Helmet>
        <title>{t('market.title')} — {t('app.name')}</title>
      </Helmet>

      <Box
        sx={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #4A4080 100%)',
          color: 'common.white',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 } }}>
          <Typography sx={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.1, mb: 1.5 }}>
            {t('market.title')}
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', opacity: 0.9, maxWidth: 700 }}>
            {t('market.subtitle')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 4, md: 6 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField
            select
            size="small"
            label={t('market.city')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            sx={{ minWidth: 200 }}
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
            onChange={(e) => setType(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {TYPES.map((t2) => (
              <MenuItem key={t2} value={t2}>{t2}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, border: 1, borderColor: 'divider', borderRadius: 3 }}>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 2 }}>
            {t('market.priceTrend')}
          </Typography>
          {trendsQuery.isLoading ? (
            <Skeleton variant="rectangular" height={320} />
          ) : !trendsQuery.data || trendsQuery.data.length === 0 ? (
            <Typography color="text.secondary">{t('market.noData')}</Typography>
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

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 2 }}>
            {t('market.areaInsights')}
          </Typography>
          {areaQuery.isLoading ? (
            <Skeleton variant="rectangular" height={320} />
          ) : !areaQuery.data || areaQuery.data.length === 0 ? (
            <Typography color="text.secondary">{t('market.noData')}</Typography>
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
      </Container>
    </Box>
  );
}
