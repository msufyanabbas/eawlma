import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { walletApi, type WalletTransaction, type WalletTxnType } from '@/api/wallet.api';
import { commissionsApi, type Commission } from '@/api/commissions.api';
import { extractErrorMessage } from '@/api/client';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';

const TXN_LABEL: Record<WalletTxnType, string> = {
  deposit: 'wallet.txnDeposit',
  withdrawal: 'wallet.txnWithdrawal',
  commission_payment: 'wallet.txnCommissionPayment',
  commission_received: 'wallet.txnCommissionReceived',
  refund: 'wallet.txnRefund',
};

const NEGATIVE_TYPES: WalletTxnType[] = ['withdrawal', 'commission_payment'];

export function WalletPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: () => walletApi.me(),
  });
  const txnQuery = useQuery({
    queryKey: ['wallet', 'transactions', { page: 1, limit: 20 }],
    queryFn: () => walletApi.transactions({ page: 1, limit: 20 }),
  });
  const commissionsQuery = useQuery({
    queryKey: ['commissions', 'my'],
    queryFn: () => commissionsApi.myCommissions(),
    retry: false,
  });

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const depositMutation = useMutation({
    mutationFn: (amount: number) => walletApi.deposit(amount),
    onSuccess: () => {
      setDepositOpen(false);
      setDepositAmount('');
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const payCommissionMutation = useMutation({
    mutationFn: (commissionId: string) => walletApi.payCommission(commissionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      void qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  const wallet = walletQuery.data?.wallet;
  const transactions = txnQuery.data?.data ?? [];
  const pendingCommissions = (commissionsQuery.data ?? []).filter(
    (c) => c.status === 'confirmed' || c.status === 'pending',
  );

  const fmtAmount = (n: number) => n.toLocaleString(i18n.language, { minimumFractionDigits: 2 });

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('wallet.title')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('wallet.title')} />

      {/* Balance card */}
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'common.white',
          borderRadius: 3,
          boxShadow: `0 18px 36px ${alpha(theme.palette.primary.main, 0.32)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2 }}>
              {t('wallet.yourBalance')}
            </Typography>
            {walletQuery.isLoading ? (
              <Skeleton width={220} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} />
            ) : (
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '2.5rem', md: '3.25rem' }, lineHeight: 1.05 }}>
                {fmtAmount(wallet?.balance ?? 0)}{' '}
                <Typography component="span" sx={{ fontSize: '1.25rem', fontWeight: 600, opacity: 0.85 }}>
                  {wallet?.currency ?? 'SAR'}
                </Typography>
              </Typography>
            )}
          </Box>
          <Button
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setDepositOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: 'common.white',
              fontWeight: 700,
              px: 3,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
            }}
          >
            {t('wallet.addFunds')}
          </Button>
        </Stack>
      </Paper>

      {/* Pending commissions to pay */}
      {pendingCommissions.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('wallet.pendingCommissions')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('wallet.pendingCommissionsBody')}
          </Typography>
          <Stack spacing={1.5}>
            {pendingCommissions.map((c) => (
              <PendingCommissionRow
                key={c.id}
                commission={c}
                disabled={
                  c.status !== 'confirmed' ||
                  payCommissionMutation.isPending ||
                  Number(wallet?.balance ?? 0) <
                    Number(c.agentCommissionAmount) + Number(c.platformCommissionAmount)
                }
                payHint={
                  c.status === 'pending'
                    ? t('wallet.commissionPendingNotice')
                    : Number(wallet?.balance ?? 0) <
                        Number(c.agentCommissionAmount) + Number(c.platformCommissionAmount)
                      ? t('wallet.insufficientBalance')
                      : undefined
                }
                onPay={() => payCommissionMutation.mutate(c.id)}
              />
            ))}
          </Stack>
          {payCommissionMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {extractErrorMessage(payCommissionMutation.error)}
            </Alert>
          )}
        </Paper>
      )}

      {/* Transaction history */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('wallet.transactions')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('wallet.type')}</TableCell>
              <TableCell>{t('common.description')}</TableCell>
              <TableCell align="right">{t('common.amount')}</TableCell>
              <TableCell>{t('common.date')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txnQuery.isLoading ? (
              <TableRow><TableCell colSpan={5}><Skeleton /></TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  {t('wallet.noTransactions')}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} />
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Deposit dialog */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('wallet.addFunds')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('wallet.depositHint')}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={t('common.amount')}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            inputProps={{ min: 1, step: 1 }}
          />
          {depositMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {extractErrorMessage(depositMutation.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={!depositAmount || Number(depositAmount) <= 0 || depositMutation.isPending}
            onClick={() => depositMutation.mutate(Number(depositAmount))}
          >
            {depositMutation.isPending ? t('common.loading') : t('wallet.deposit')}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

function TransactionRow({ txn }: { txn: WalletTransaction }) {
  const { t, i18n } = useTranslation();
  const negative = NEGATIVE_TYPES.includes(txn.type);
  const sign = negative ? '−' : '+';
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
          {t(TXN_LABEL[txn.type])}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {txn.description ?? '—'}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: negative ? 'error.main' : 'success.main' }}
        >
          {sign} {txn.amount.toLocaleString(i18n.language, { minimumFractionDigits: 2 })} SAR
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {new Date(txn.createdAt).toLocaleString(i18n.language)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={t(`wallet.status.${txn.status}`, txn.status)}
          color={txn.status === 'completed' ? 'success' : txn.status === 'failed' ? 'error' : 'warning'}
          variant="outlined"
        />
      </TableCell>
    </TableRow>
  );
}

function PendingCommissionRow({
  commission,
  onPay,
  disabled,
  payHint,
}: {
  commission: Commission;
  onPay: () => void;
  disabled: boolean;
  payHint?: string;
}) {
  const { t, i18n } = useTranslation();
  const total = commission.agentCommissionAmount + commission.platformCommissionAmount;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('wallet.commissionFor')} {commission.listingId.slice(0, 8)}…
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('wallet.agentShare')} {commission.agentCommissionAmount.toLocaleString(i18n.language)} ·{' '}
            {t('wallet.platformShare')} {commission.platformCommissionAmount.toLocaleString(i18n.language)}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
          {total.toLocaleString(i18n.language)} SAR
        </Typography>
        <Stack alignItems="flex-end" spacing={0.5}>
          <Button
            variant="contained"
            disabled={disabled}
            onClick={onPay}
            sx={{ fontWeight: 700, color: 'common.white' }}
          >
            {t('wallet.payNow')}
          </Button>
          {payHint && (
            <Typography variant="caption" color="warning.main">
              {payHint}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
