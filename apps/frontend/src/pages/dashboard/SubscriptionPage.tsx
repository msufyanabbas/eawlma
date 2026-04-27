import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import DownloadIcon from '@mui/icons-material/Download';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SubscriptionPlan } from '@aqarat/shared-types';

import { subscriptionsApi, type PlanCatalogEntry } from '@/api/subscriptions.api';
import { paymentsApi } from '@/api/payments.api';
import { apiClient } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';

export function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const meQuery = useQuery({ queryKey: ['subscriptions', 'me'], queryFn: () => subscriptionsApi.me() });
  const plansQuery = useQuery({ queryKey: ['subscriptions', 'plans'], queryFn: () => subscriptionsApi.plans() });
  const paymentsQuery = useQuery({ queryKey: ['payments', 'mine'], queryFn: () => paymentsApi.mine(1, 20) });

  const upgradeMutation = useMutation({
    mutationFn: (planKey: SubscriptionPlan) => paymentsApi.subscription(planKey, window.location.href),
    onSuccess: (resp) => {
      void qc.invalidateQueries({ queryKey: ['payments', 'mine'] });
      if (resp.redirectUrl) {
        window.location.href = resp.redirectUrl;
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionsApi.cancel(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions', 'me'] }),
  });

  const me = meQuery.data;
  const plans = plansQuery.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.subscription')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('dashboard.subscription')} />

      {/* Current plan card */}
      <Paper sx={{ p: 3 }}>
        {meQuery.isLoading ? (
          <Stack spacing={1}><Skeleton width="40%" /><Skeleton width="60%" /></Stack>
        ) : me ? (
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <StarIcon color="secondary" />
                <Typography variant="overline" color="text.secondary">Current plan</Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, textTransform: 'capitalize' }}>{me.planKey}</Typography>
              <Typography variant="body2" color="text.secondary">
                Renews {new Date(me.currentPeriodEnd).toLocaleDateString(i18n.language)}
              </Typography>
              {me.cancelAtPeriodEnd && (
                <Chip label="Cancels at period end" color="warning" size="small" sx={{ mt: 1 }} />
              )}
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                <KpiTile label="Listing quota" value={String(me.listingQuota)} />
                <KpiTile label="Featured quota" value={String(me.featuredQuota)} />
                <KpiTile label="Status" value={me.status} />
                {!me.cancelAtPeriodEnd && me.planKey !== SubscriptionPlan.FREE && (
                  <Grid item xs={12}>
                    <Button color="error" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                      Cancel at period end
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        ) : null}
      </Paper>

      {/* Plan comparison */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Plans</Typography>
        {plansQuery.isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={3}><Skeleton variant="rectangular" height={300} /></Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={me?.planKey === plan.key}
                onUpgrade={() => upgradeMutation.mutate(plan.key as SubscriptionPlan)}
                disabled={upgradeMutation.isPending}
              />
            ))}
          </Grid>
        )}
        {upgradeMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Could not start the upgrade — please try again.
          </Alert>
        )}
      </Box>

      {/* Billing history */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Billing history</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Invoice</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentsQuery.isLoading ? (
              <TableRow><TableCell colSpan={5}><Skeleton /></TableCell></TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  No payments yet
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                  <TableCell>{p.description ?? p.purpose}</TableCell>
                  <TableCell><Chip size="small" label={p.status} sx={{ textTransform: 'capitalize' }} /></TableCell>
                  <TableCell align="right">{(p.amount / 100).toFixed(2)} {p.currency}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={`${apiClient.defaults.baseURL ?? ''}/payments/${p.id}/invoice`}
                      target="_blank"
                      rel="noopener"
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </DashboardLayout>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={6} sm={4}>
      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>{label}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{value}</Typography>
      </Box>
    </Grid>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  disabled,
}: {
  plan: PlanCatalogEntry;
  isCurrent: boolean;
  onUpgrade: () => void;
  disabled: boolean;
}) {
  const { i18n } = useTranslation();
  const isFree = plan.key === SubscriptionPlan.FREE;
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: isCurrent ? 2 : 1,
        borderColor: isCurrent ? 'primary.main' : 'divider',
      }}>
        {isCurrent && (
          <Chip size="small" color="primary" label="Current" sx={{ position: 'absolute', top: 12, insetInlineEnd: 12 }} />
        )}
        <Typography variant="overline" color="text.secondary">{plan.billingPeriod}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {i18n.language === 'ar' ? plan.nameAr : plan.nameEn}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1, mb: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>{Number(plan.price).toLocaleString()}</Typography>
          <Typography variant="caption" color="text.secondary">{plan.currency}/{plan.billingPeriod}</Typography>
        </Stack>
        <Stack spacing={1.25} sx={{ flex: 1 }}>
          <Feature label={`${plan.listingQuota} active listings`} />
          <Feature label={`${plan.featuredQuota} featured/mo`} />
          <Feature label={`${plan.agentSeats} agent seat${plan.agentSeats > 1 ? 's' : ''}`} />
          {plan.features?.map((f) => <Feature key={f} label={f} />)}
        </Stack>
        <Button
          variant={isCurrent ? 'outlined' : 'contained'}
          color="primary"
          sx={{ mt: 3 }}
          disabled={isCurrent || isFree || disabled}
          onClick={onUpgrade}
        >
          {isCurrent ? 'Current plan' : isFree ? 'Free plan' : 'Upgrade'}
        </Button>
      </Card>
    </Grid>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckIcon sx={{ color: 'success.main', fontSize: 18 }} />
      <Typography variant="body2">{label}</Typography>
    </Stack>
  );
}
