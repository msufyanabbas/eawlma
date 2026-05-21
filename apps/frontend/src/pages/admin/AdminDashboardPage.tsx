import {
  Avatar,
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import MailIcon from '@mui/icons-material/MailOutline';
import MoneyIcon from '@mui/icons-material/PaymentsOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import ReportIcon from '@mui/icons-material/ReportProblemOutlined';
import BookmarkIcon from '@mui/icons-material/BookOnline';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useQuery } from '@tanstack/react-query';
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
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import RTLChart from '@/components/charts/RTLChart';
import { useChartTranslations } from '@/hooks/useChartTranslations';
import { KpiCard } from '@/pages/dashboard/components/KpiCard';

interface AuditEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changedFields: Record<string, { before: unknown; after: unknown }>;
}

interface AuditPage {
  data: AuditEntry[];
  meta: { total: number };
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { translateLabel, formatTooltipValue, reverseForRTL, formatNumber } =
    useChartTranslations();

  // Live KPIs from the dedicated /admin/stats endpoint.
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.dashboardStats(),
  });
  const stats = statsQuery.data;

  // Recent activity (last 20 audit entries)
  const auditQuery = useQuery({
    queryKey: ['admin', 'audit', 'recent'],
    queryFn: () => adminApi.audit({ page: 1, limit: 20 }),
  });
  const auditEnvelope = auditQuery.data as { data?: AuditPage } | AuditPage | undefined;
  const auditPage: AuditPage =
    (auditEnvelope as { data?: AuditPage })?.data ??
    (auditEnvelope as AuditPage) ??
    { data: [], meta: { total: 0 } };
  const recentAudit = auditPage.data ?? [];

  // Synthesize daily series from audit log entries (entityType='listing'+action='create')
  const dailyListingCreates = useMemo30Day(recentAudit, 'listing', 'create');
  const dailyInquiryCreates = useMemo30Day(recentAudit, 'inquiry', 'create');

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('nav.admin')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('nav.admin')} subtitle={t('adminDashboard.subtitle')} />

      {/* ---- KPI row ---- */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiTotalUsers')}
            value={stats?.totalUsers ?? 0}
            icon={<PeopleIcon />}
            tone="listings"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiVerifiedAgents')}
            value={stats?.totalAgents ?? 0}
            icon={<HomeIcon />}
            tone="views"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiActiveListings')}
            value={stats?.activeListings ?? 0}
            icon={<StorefrontIcon />}
            tone="listings"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiTotalBookings')}
            value={stats?.totalBookings ?? 0}
            icon={<BookmarkIcon />}
            tone="views"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiTotalInquiries')}
            value={stats?.totalInquiries ?? 0}
            icon={<MailIcon />}
            tone="messages"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiPendingReview')}
            value={stats?.pendingModeration ?? 0}
            icon={<GavelIcon />}
            tone="inquiries"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiOpenDisputes')}
            value={stats?.openDisputes ?? 0}
            icon={<ReportIcon />}
            tone="inquiries"
            loading={statsQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <KpiCard
            label={t('adminDashboard.kpiPlatformEarnings')}
            value={Math.round(stats?.platformEarnings ?? 0)}
            icon={<MoneyIcon />}
            tone="listings"
            loading={statsQuery.isLoading}
          />
        </Grid>
      </Grid>

      {/* ---- Charts ---- */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{t('adminDashboard.chartListingsCreated')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('adminDashboard.chartListingsHint')}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <RTLChart height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reverseForRTL(dailyListingCreates)}>
                    <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={translateLabel}
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatNumber}
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={formatTooltipValue}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t('dashboard.listings')}
                      stroke={theme.palette.primary.main}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </RTLChart>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{t('adminDashboard.chartInquiryEvents')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('adminDashboard.chartFromAudit')}</Typography>
            <Box sx={{ mt: 2 }}>
              <RTLChart height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reverseForRTL(dailyInquiryCreates)}>
                    <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={translateLabel}
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatNumber}
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={formatTooltipValue}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name={t('dashboard.inquiries')}
                      fill={theme.palette.success.main}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </RTLChart>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ---- Recent activity feed ---- */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <HistoryIcon color="action" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('adminDashboard.recentActivity')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('adminDashboard.last20Events')}</Typography>
        </Stack>
        {recentAudit.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('adminDashboard.noActivity')}
          </Typography>
        ) : (
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
            {recentAudit.map((entry) => (
              <Stack key={entry.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {(entry.actorId ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'inherit' }}>
                    {t('adminDashboard.actionOnEntity', {
                      action: entry.action,
                      entity: `${entry.entityType}/${(entry.entityId ?? '').slice(0, 8)}`,
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('adminDashboard.byActor', {
                      actor: entry.actorId ? entry.actorId.slice(0, 8) : t('adminDashboard.actorSystem'),
                      date: new Date(entry.createdAt).toLocaleString(i18n.language),
                    })}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </AdminLayout>
  );
}

// Buckets the last 30 days, counting how many audit entries match the
// entityType + action pair on each day.
function useMemo30Day(
  rows: AuditEntry[],
  entityType: string,
  action: string,
): Array<{ date: string; count: number }> {
  const today = new Date();
  const out: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    out.push({ date: d.toISOString().slice(5, 10), count: 0 });
  }
  for (const r of rows) {
    if (r.entityType !== entityType || r.action !== action) continue;
    const day = r.createdAt.slice(5, 10);
    const slot = out.find((x) => x.date === day);
    if (slot) slot.count += 1;
  }
  return out;
}
