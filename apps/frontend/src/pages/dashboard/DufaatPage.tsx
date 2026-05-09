import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import {
  dufaatApi,
  type DufaatPlan,
} from '@/api/dufaat.api';
import { extractErrorMessage } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';

export function DufaatPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['dufaat', 'my'],
    queryFn: () => dufaatApi.myPlans(),
  });

  const payMutation = useMutation({
    mutationFn: (installmentId: string) => dufaatApi.payInstallment(installmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dufaat'] }),
  });

  const plans = query.data ?? [];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dufaat.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('dufaat.title')} subtitle={t('dufaat.subtitle')} />

      {query.isLoading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : plans.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <EmptyState title={t('dufaat.noPlans')} />
        </Paper>
      ) : (
        <Stack spacing={3}>
          {payMutation.isError && (
            <Alert severity="error">{extractErrorMessage(payMutation.error)}</Alert>
          )}
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              language={i18n.language}
              onPay={(id) => payMutation.mutate(id)}
              isPaying={payMutation.isPending}
            />
          ))}
        </Stack>
      )}
    </DashboardLayout>
  );
}

interface PlanCardProps {
  plan: DufaatPlan;
  language: string;
  onPay: (id: string) => void;
  isPaying: boolean;
}

function PlanCard({ plan, language, onPay, isPaying }: PlanCardProps) {
  const { t } = useTranslation();
  const paid = plan.installments.filter((i) => i.status === 'paid').length;
  const next = plan.installments.find((i) => i.status === 'pending' || i.status === 'overdue');
  const progress = (paid / plan.installments.length) * 100;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={1}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            {t('dufaat.plan')} #{plan.id.slice(0, 8)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {plan.startDate} → {plan.endDate}
          </Typography>
        </Box>
        <Chip
          color={plan.status === 'active' ? 'success' : 'default'}
          label={t(`dufaat.status.${plan.status}`, { defaultValue: plan.status })}
        />
      </Stack>

      <Box sx={{ mt: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {paid} / {plan.installments.length} {t('dufaat.installmentsPaid')}
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 2 }}>
        <Stat
          label={t('dufaat.monthlyPayment')}
          value={`${plan.monthlyInstallment.toLocaleString(language)} ${t('listing.currency')}`}
        />
        <Stat
          label={t('dufaat.totalAnnual')}
          value={`${plan.totalAnnualAmount.toLocaleString(language)} ${t('listing.currency')}`}
        />
        <Stat
          label={t('dufaat.platformFee')}
          value={`${plan.platformFee.toLocaleString(language)} ${t('listing.currency')}`}
        />
      </Stack>

      {next && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('dufaat.nextPayment')}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              {next.dueDate} — {next.amount.toLocaleString(language)} {t('listing.currency')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={isPaying}
            onClick={() => onPay(next.id)}
          >
            {t('dufaat.payNow')}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
