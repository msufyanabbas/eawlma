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
import { UserStatus } from '@aqarat/shared-types';

import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
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

  // Best-effort platform KPIs from existing admin endpoints. A dedicated
  // /admin/dashboard endpoint would render this trivial; for now we derive.
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: () => adminApi.users({ page: 1, limit: 1 }),
  });
  const activeUsersQuery = useQuery({
    queryKey: ['admin', 'users', 'active'],
    queryFn: () => adminApi.users({ page: 1, limit: 1, status: UserStatus.ACTIVE }),
  });
  const pendingQuery = useQuery({
    queryKey: ['admin', 'pending', 1],
    queryFn: () => adminApi.pendingListings({ page: 1, limit: 1 }),
  });
  const recentSignupsQuery = useQuery({
    queryKey: ['admin', 'users', 'recent'],
    queryFn: () => adminApi.users({ page: 1, limit: 50 }),
  });

  // Derive new signups today
  const todayIso = new Date().toISOString().slice(0, 10);
  const newSignupsToday = (recentSignupsQuery.data?.data ?? []).filter(
    (u) => u.createdAt.startsWith(todayIso),
  ).length;

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

      <PageHeader title={t('nav.admin')} subtitle="Platform overview" />

      {/* ---- KPI row ---- */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard
            label="Pending review"
            value={pendingQuery.data?.meta.total ?? 0}
            icon={<GavelIcon />}
            color="warning"
            loading={pendingQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard
            label="Active users"
            value={(activeUsersQuery.data?.meta.total ?? 0).toLocaleString(i18n.language)}
            icon={<PeopleIcon />}
            color="primary"
            loading={activeUsersQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard
            label="Total users"
            value={(usersQuery.data?.meta.total ?? 0).toLocaleString(i18n.language)}
            icon={<HomeIcon />}
            color="info"
            loading={usersQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard
            label="Inquiry events (audit)"
            value={recentAudit.filter((a) => a.entityType === 'inquiry').length}
            icon={<MailIcon />}
            color="success"
            loading={auditQuery.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard
            label="Signups today"
            value={newSignupsToday}
            icon={<MoneyIcon />}
            color="secondary"
            loading={recentSignupsQuery.isLoading}
          />
        </Grid>
      </Grid>

      {/* ---- Charts ---- */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Listings created (last 30d)</Typography>
            <Typography variant="caption" color="text.secondary">
              Derived from the audit log — connect a dedicated <code>/admin/metrics</code> endpoint for full coverage.
            </Typography>
            <Box sx={{ height: 280, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyListingCreates}>
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
                  <Line type="monotone" dataKey="count" stroke={theme.palette.primary.main} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Inquiry events (last 30d)</Typography>
            <Typography variant="caption" color="text.secondary">From audit log</Typography>
            <Box sx={{ height: 280, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyInquiryCreates}>
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
                  <Bar dataKey="count" fill={theme.palette.success.main} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ---- Recent activity feed ---- */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <HistoryIcon color="action" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent activity</Typography>
          <Typography variant="caption" color="text.secondary">last 20 events</Typography>
        </Stack>
        {recentAudit.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No recent activity
          </Typography>
        ) : (
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
            {recentAudit.map((entry) => (
              <Stack key={entry.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {(entry.actorId ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2">
                    <strong>{entry.action}</strong> on{' '}
                    <Box component="span" sx={{ fontFamily: 'monospace' }}>
                      {entry.entityType}/{(entry.entityId ?? '').slice(0, 8)}
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {entry.actorId ? entry.actorId.slice(0, 8) : 'system'} · {new Date(entry.createdAt).toLocaleString(i18n.language)}
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
