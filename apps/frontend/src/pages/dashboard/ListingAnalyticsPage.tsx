import {
  Box,
  Grid,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { analyticsApi } from '@/api/analytics.api';
import { listingsApi } from '@/api/listings.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { KpiCard } from './components/KpiCard';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HouseIcon from '@mui/icons-material/HomeOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import TrendIcon from '@mui/icons-material/TrendingUp';

const RANGE_OPTIONS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

export function ListingAnalyticsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? '';
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);

  const listingQuery = useQuery({
    queryKey: ['listings', id],
    queryFn: () => listingsApi.getById(id),
    enabled: Boolean(id),
  });
  const viewsQuery = useQuery({
    queryKey: ['analytics', 'views', id, rangeDays],
    queryFn: () => analyticsApi.views(id, rangeDays),
    enabled: Boolean(id),
  });
  const funnelQuery = useQuery({
    queryKey: ['analytics', 'funnel', id, rangeDays],
    queryFn: () => analyticsApi.funnel(id, rangeDays),
    enabled: Boolean(id),
  });
  const sourcesQuery = useQuery({
    queryKey: ['analytics', 'sources', id, rangeDays],
    queryFn: () => analyticsApi.sources(id, rangeDays),
    enabled: Boolean(id),
  });
  const devicesQuery = useQuery({
    queryKey: ['analytics', 'devices', id, rangeDays],
    queryFn: () => analyticsApi.devices(id, rangeDays),
    enabled: Boolean(id),
  });

  const listing = listingQuery.data;
  const views = viewsQuery.data ?? [];
  const funnel = funnelQuery.data;
  const sources = sourcesQuery.data ?? [];
  const devices = devicesQuery.data ?? [];

  // Funnel chart data: views → form open (proxy: detailViews × 0.4) → submitted → qualified (proxy: × 0.5)
  const funnelData = funnel
    ? [
        { stage: 'Views', value: funnel.impressions },
        { stage: 'Detail page', value: funnel.detailViews },
        { stage: 'Inquiry sent', value: funnel.inquiries },
        { stage: 'Qualified', value: Math.max(0, Math.round(funnel.inquiries * 0.5)) },
      ]
    : [];

  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.grey[500],
  ];

  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics — {listing?.referenceCode ?? ''}</title>
      </Helmet>

      <PageHeader
        title={`Analytics · ${listing?.referenceCode ?? ''}`}
        subtitle={listing?.title}
        breadcrumbs={[
          { label: t('dashboard.overview'), to: '/dashboard' },
          { label: t('dashboard.listings'), to: '/dashboard/listings' },
          { label: 'Analytics' },
        ]}
        action={
          <ToggleButtonGroup
            value={rangeDays}
            exclusive
            size="small"
            onChange={(_, v) => v && setRangeDays(v as RangeDays)}
          >
            {RANGE_OPTIONS.map((r) => (
              <ToggleButton key={r} value={r}>{r}d</ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      {/* KPI summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Impressions" value={funnel?.impressions ?? 0} icon={<HouseIcon />} tone="listings" loading={funnelQuery.isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Detail views" value={funnel?.detailViews ?? 0} icon={<VisibilityIcon />} tone="views" loading={funnelQuery.isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Inquiries" value={funnel?.inquiries ?? 0} icon={<MailIcon />} tone="messages" loading={funnelQuery.isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Conversion" value={`${funnel?.conversionRate ?? 0}%`} icon={<TrendIcon />} tone="inquiries" loading={funnelQuery.isLoading} />
        </Grid>
      </Grid>

      {/* Views over time */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Views over time</Typography>
        {viewsQuery.isLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : (
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={views.map((p) => ({ date: p.date.slice(5), Impressions: p.impressions, Views: p.detailViews, Inquiries: p.inquiries }))}>
                <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={12} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={12} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="Impressions" stroke={theme.palette.primary.main} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Views" stroke={theme.palette.info.main} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Inquiries" stroke={theme.palette.success.main} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Sources pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Traffic sources</Typography>
            {sourcesQuery.isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : sources.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                No source data yet
              </Typography>
            ) : (
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="count"
                      nameKey="source"
                      outerRadius={90}
                      label={(entry) => entry.source}
                    >
                      {sources.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Devices donut */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Devices</Typography>
            {devicesQuery.isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : devices.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                No device data yet
              </Typography>
            ) : (
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devices}
                      dataKey="count"
                      nameKey="device"
                      innerRadius={56}
                      outerRadius={92}
                      label={(entry) => entry.device}
                    >
                      {devices.map((_, i) => <Cell key={i} fill={palette[(i + 2) % palette.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Funnel bar (rendered as a horizontal bar chart) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Inquiry funnel</Typography>
            {funnelQuery.isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : (
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                    <XAxis type="number" stroke={theme.palette.text.secondary} fontSize={12} />
                    <YAxis type="category" dataKey="stage" stroke={theme.palette.text.secondary} fontSize={12} width={120} />
                    <RechartsTooltip />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {funnelData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
