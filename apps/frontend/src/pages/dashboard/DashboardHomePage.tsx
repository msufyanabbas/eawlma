import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MailIcon from '@mui/icons-material/MailOutline';
import TrendIcon from '@mui/icons-material/TrendingUp';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import ReplyIcon from '@mui/icons-material/Reply';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
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
import { ListingStatus } from '@eawlma/shared-types';

import { analyticsApi } from '@/api/analytics.api';
import { listingsApi } from '@/api/listings.api';
import { inquiriesApi } from '@/api/inquiries.api';
import { messagingApi } from '@/api/messaging.api';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { useAuthStore } from '@/store/auth.store';

import { KpiCard } from './components/KpiCard';
import { InquiryStatusChip } from './components/StatusChip';

export function DashboardHomePage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  // ---- data sources --------------------------------------------------
  const dashboardSummary = useQuery({
    queryKey: ['analytics', 'agent-dashboard', 30],
    queryFn: () => analyticsApi.agentDashboard(30),
  });

  const myListings = useQuery({
    queryKey: ['listings', 'mine', { limit: 100 }],
    queryFn: () => listingsApi.mine({ limit: 100 }),
  });

  const recentInquiries = useQuery({
    queryKey: ['inquiries', 'mine-agent', { limit: 10 }],
    queryFn: () => inquiriesApi.mineAsAgent({ limit: 10 }),
  });

  const unreadMessages = useQuery({
    queryKey: ['conversations', 'unread-total'],
    queryFn: () => messagingApi.unreadTotal(),
  });

  const currentPlan = useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: () => subscriptionsApi.me(),
  });

  // ---- derived -------------------------------------------------------
  const summary = dashboardSummary.data;
  const allListings = myListings.data?.data ?? [];
  const activeListings = allListings.filter((l) => l.status === ListingStatus.ACTIVE);
  const inquiriesData = recentInquiries.data?.data ?? [];

  // Daily views chart (best-effort: take first ACTIVE listing for the line; in
  // a richer build we'd sum across all owned listings).
  const lineSourceListing = activeListings[0];
  const lineQuery = useQuery({
    queryKey: ['analytics', 'views', lineSourceListing?.id],
    queryFn: () => (lineSourceListing ? analyticsApi.views(lineSourceListing.id, 30) : []),
    enabled: Boolean(lineSourceListing),
  });
  const lineData = (lineQuery.data ?? []).map((p) => ({
    date: p.date.slice(5),
    views: p.detailViews,
  }));

  // Top 5 listings by inquiries — derived locally from listing.inquiryCount.
  const topListings = [...allListings]
    .sort((a, b) => (b.inquiryCount ?? 0) - (a.inquiryCount ?? 0))
    .slice(0, 5)
    .map((l) => ({
      name: l.referenceCode,
      inquiries: l.inquiryCount ?? 0,
      title: l.title,
    }));

  // Listings needing attention.
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const attention = allListings.filter((l) => {
    if (l.status === ListingStatus.REJECTED) return true;
    if (l.expiresAt && new Date(l.expiresAt).getTime() - now < SEVEN_DAYS_MS) return true;
    if (l.status === ListingStatus.ACTIVE && (l.inquiryCount ?? 0) < 2) return true;
    return false;
  }).slice(0, 5);

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.overview')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={`${t('dashboard.overview')}${user ? ` · ${user.firstName}` : ''}`}
        subtitle={`${summary?.rangeStart ?? '—'} – ${summary?.rangeEnd ?? '—'}`}
        action={
          <Stack direction="row" spacing={1.25}>
            <Button
              component={Link}
              to="/dashboard/listings/new"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              {t('dashboard.newListing')}
            </Button>
            <Button
              component={Link}
              to="/messages"
              variant="outlined"
              color="primary"
              startIcon={<ChatIcon />}
              sx={{ borderRadius: 3, fontWeight: 600 }}
            >
              {t('nav.messages')}
            </Button>
            <Button
              component={Link}
              to="/dashboard/subscription"
              variant="outlined"
              sx={{
                borderRadius: 3,
                fontWeight: 600,
                borderColor: 'secondary.main',
                color: 'secondary.main',
                '&:hover': { borderColor: 'secondary.dark', bgcolor: 'rgba(212,168,67,0.06)' },
              }}
            >
              {t('dashboard.subscription')}
            </Button>
          </Stack>
        }
      />

      {/* ---------------- KPI row — all 6 tiles align on one row at lg ---------------- */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Active listings"
            value={summary?.activeListings ?? 0}
            icon={<HomeIcon />}
            tone="listings"
            loading={dashboardSummary.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Total views (30d)"
            value={summary?.totalDetailViews ?? 0}
            icon={<VisibilityIcon />}
            tone="views"
            loading={dashboardSummary.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Inquiries (30d)"
            value={summary?.totalInquiries ?? 0}
            icon={<MailIcon />}
            tone="inquiries"
            loading={dashboardSummary.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Conversion"
            value={`${summary?.conversionRate ?? 0}%`}
            icon={<TrendIcon />}
            tone="conversion"
            loading={dashboardSummary.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Unread messages"
            value={unreadMessages.data ?? 0}
            icon={<ChatIcon />}
            tone="messages"
            loading={unreadMessages.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <KpiCard
            label="Current plan"
            value={(currentPlan.data?.planKey ?? 'free').toString().toUpperCase()}
            icon={<StarIcon />}
            tone="plan"
            loading={currentPlan.isLoading}
          />
        </Grid>
      </Grid>

      {/* ---------------- Charts ---------------- */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Views over time
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last 30 days · {lineSourceListing ? lineSourceListing.referenceCode : 'no active listings'}
            </Typography>
            <Box sx={{ height: 280, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={12} />
                  <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Top listings by inquiries
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lifetime totals
            </Typography>
            <Box sx={{ height: 280, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topListings}>
                  <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={11} />
                  <YAxis stroke={theme.palette.text.secondary} fontSize={12} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                    labelFormatter={(label, payload) => {
                      const t = payload?.[0]?.payload as { title?: string } | undefined;
                      return t?.title ?? label;
                    }}
                  />
                  <Bar
                    dataKey="inquiries"
                    fill={theme.palette.success.main}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ---------------- Recent inquiries + Attention ---------------- */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recent inquiries
              </Typography>
              <Button component={Link} to="/dashboard/inquiries" size="small">
                {t('common.viewAll')}
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>Listing</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {inquiriesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        No inquiries yet — {t('common.search')} for properties to inquire on
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  inquiriesData.map((inq) => (
                    <TableRow key={inq.id} hover>
                      <TableCell>{inq.guestName ?? '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inq.listingId.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(inq.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                      <TableCell><InquiryStatusChip status={inq.status} /></TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          component={Link}
                          to="/dashboard/inquiries"
                          aria-label="reply"
                        >
                          <ReplyIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <WarningIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Listings needing attention
              </Typography>
            </Stack>
            {attention.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Nothing flagged — your listings are healthy 🎉
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {attention.map((l) => {
                  const reason =
                    l.status === ListingStatus.REJECTED
                      ? 'Rejected — needs revision'
                      : l.expiresAt && new Date(l.expiresAt).getTime() - now < SEVEN_DAYS_MS
                        ? `Expires ${new Date(l.expiresAt).toLocaleDateString(i18n.language)}`
                        : 'Low engagement (< 2 inquiries)';
                  return (
                    <Box
                      key={l.id}
                      component={Link}
                      to={`/dashboard/listings/${l.id}/analytics` as never}
                      sx={{
                        display: 'block',
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { borderColor: 'warning.main', bgcolor: 'warning.50' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                            {l.title}
                          </Typography>
                          <Typography variant="caption" color="warning.dark">
                            {reason}
                          </Typography>
                        </Box>
                        <Chip size="small" label={l.referenceCode} variant="outlined" />
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
