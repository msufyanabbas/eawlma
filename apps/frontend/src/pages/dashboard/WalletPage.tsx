import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@eawlma/shared-types';

import { walletApi, type WalletTransaction, type WalletTxnType } from '@/api/wallet.api';
import { commissionsApi, type Commission } from '@/api/commissions.api';
import { payoutsApi, type PayoutRequest, type PayoutStatus } from '@/api/payouts.api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { PageHeader } from '@/components/global/PageHeader';

const SAUDI_BANKS = [
  'Al Rajhi Bank - مصرف الراجحي',
  'Riyad Bank - بنك الرياض',
  'Saudi National Bank - البنك الأهلي السعودي',
  'Saudi Fransi Bank - البنك السعودي الفرنسي',
  'Alinma Bank - مصرف الإنماء',
  'Arab National Bank - البنك العربي الوطني',
  'Al Bilad Bank - بنك البلاد',
  'Bank AlJazira - بنك الجزيرة',
  'Other',
];

const PAYOUT_STATUS_COLORS: Record<
  PayoutStatus,
  { bg: string; text: string; labelKey: string }
> = {
  pending: { bg: '#E5E7EB', text: '#374151', labelKey: 'wallet.payoutStatus.pending' },
  processing: { bg: '#CCE5FF', text: '#004085', labelKey: 'wallet.payoutStatus.processing' },
  paid: { bg: '#D4EDDA', text: '#155724', labelKey: 'wallet.payoutStatus.paid' },
  failed: { bg: '#F8D7DA', text: '#721C24', labelKey: 'wallet.payoutStatus.failed' },
  rejected: { bg: '#F8D7DA', text: '#721C24', labelKey: 'wallet.payoutStatus.rejected' },
};

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
  // Buyer-side: commissions where the current user owes payment.
  const commissionsQuery = useQuery({
    queryKey: ['commissions', 'buyer-me'],
    queryFn: () => commissionsApi.myAsBuyer(),
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

  // Payouts (agent-side withdrawal to bank). Buyers never trigger this.
  const sessionUser = useAuthStore((s) => s.user);
  const isAgentLike =
    sessionUser?.role === UserRole.AGENT ||
    sessionUser?.role === UserRole.AGENCY_ADMIN ||
    sessionUser?.role === UserRole.ADMIN;
  const payoutsQuery = useQuery({
    queryKey: ['payouts', 'mine'],
    queryFn: () => payoutsApi.my(),
    enabled: isAgentLike,
    retry: false,
  });

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutIban, setPayoutIban] = useState('SA');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutBeneficiary, setPayoutBeneficiary] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  // Pre-fill the beneficiary name from the auth store (or `me` once it loads).
  useEffect(() => {
    if (!sessionUser) return;
    setPayoutBeneficiary(`${sessionUser.firstName ?? ''} ${sessionUser.lastName ?? ''}`.trim());
  }, [sessionUser]);

  const payoutMutation = useMutation({
    mutationFn: () =>
      payoutsApi.request({
        amount: Number(payoutAmount),
        ibanNumber: payoutIban.replace(/\s+/g, '').toUpperCase(),
        bankName: payoutBank,
      }),
    onSuccess: () => {
      setPayoutSuccess(true);
      setPayoutAmount('');
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      void qc.invalidateQueries({ queryKey: ['payouts'] });
    },
  });

  const wallet = walletQuery.data?.wallet;
  const transactions = txnQuery.data?.data ?? [];
  const payouts = payoutsQuery.data ?? [];
  // Buyers only see commissions that are *confirmed* (admin-approved) or
  // still *pending* admin confirmation. Once paid we drop them from the list.
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
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
            {/* Request Payout — only agent-side users with at least 100 SAR */}
            {isAgentLike && (
              <Button
                size="large"
                startIcon={<AccountBalanceIcon />}
                disabled={Number(wallet?.balance ?? 0) < 100}
                onClick={() => {
                  setPayoutSuccess(false);
                  setPayoutOpen(true);
                }}
                sx={{
                  bgcolor: 'common.white',
                  color: 'primary.dark',
                  fontWeight: 700,
                  px: 3,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.4)',
                    color: 'rgba(26,26,46,0.55)',
                  },
                }}
              >
                {t('wallet.requestPayout')}
              </Button>
            )}
          </Stack>
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

      {/* Payout history (agent-side only) */}
      {isAgentLike && (
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('wallet.payoutHistory')}
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.date')}</TableCell>
                <TableCell align="right">{t('common.amount')}</TableCell>
                <TableCell>{t('wallet.ibanNumber')}</TableCell>
                <TableCell>{t('wallet.bankName')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payoutsQuery.isLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton /></TableCell></TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    {t('wallet.noPayouts')}
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => <PayoutRow key={p.id} payout={p} />)
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

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

      {/* Payout dialog (agent-side only) */}
      {isAgentLike && (
        <Dialog
          open={payoutOpen}
          onClose={() => setPayoutOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('wallet.requestPayout')}</DialogTitle>
          <DialogContent>
            {payoutSuccess ? (
              <Alert severity="success">{t('wallet.payoutProcessing')}</Alert>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  autoFocus
                  fullWidth
                  type="number"
                  label={t('wallet.payoutAmount')}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  helperText={`${t('wallet.minPayout')} · ${t('wallet.yourBalance')}: ${fmtAmount(wallet?.balance ?? 0)} ${t('listing.currency')}`}
                  inputProps={{ min: 100, step: 10, max: wallet?.balance ?? undefined }}
                />
                <TextField
                  fullWidth
                  label={t('wallet.ibanNumber')}
                  value={payoutIban}
                  onChange={(e) =>
                    setPayoutIban(e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 24))
                  }
                  helperText={t('wallet.ibanFormat')}
                  inputProps={{ maxLength: 24 }}
                  error={
                    payoutIban.length > 0 && !/^SA\d{0,22}$/.test(payoutIban)
                  }
                />
                <TextField
                  select
                  fullWidth
                  label={t('wallet.bankName')}
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                >
                  {SAUDI_BANKS.map((bank) => (
                    <MenuItem key={bank} value={bank}>
                      {bank}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label={t('wallet.beneficiaryName')}
                  value={payoutBeneficiary}
                  onChange={(e) => setPayoutBeneficiary(e.target.value)}
                  disabled
                  helperText={t('wallet.beneficiaryHint')}
                />
                {payoutMutation.isError && (
                  <Alert severity="error">
                    {extractErrorMessage(payoutMutation.error)}
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayoutOpen(false)}>{t('common.cancel')}</Button>
            {!payoutSuccess && (
              <Button
                variant="contained"
                disabled={
                  !payoutAmount ||
                  Number(payoutAmount) < 100 ||
                  Number(payoutAmount) > Number(wallet?.balance ?? 0) ||
                  !/^SA\d{22}$/.test(payoutIban) ||
                  !payoutBank ||
                  payoutMutation.isPending
                }
                onClick={() => payoutMutation.mutate()}
                sx={{ fontWeight: 700, color: 'common.white' }}
              >
                {payoutMutation.isPending ? t('common.loading') : t('wallet.requestPayout')}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

function PayoutRow({ payout }: { payout: PayoutRequest }) {
  const { t, i18n } = useTranslation();
  const palette = PAYOUT_STATUS_COLORS[payout.status];
  // Mask everything except SA prefix + last 4 chars so the row never leaks
  // the full IBAN to anyone shoulder-surfing.
  const maskedIban =
    payout.ibanNumber.length > 8
      ? `${payout.ibanNumber.slice(0, 4)}…${payout.ibanNumber.slice(-4)}`
      : payout.ibanNumber;
  return (
    <TableRow>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {new Date(payout.requestedAt).toLocaleString(i18n.language)}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 700 }}>
        {payout.amount.toLocaleString(i18n.language, { minimumFractionDigits: 2 })} {t('listing.currency')}
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{maskedIban}</TableCell>
      <TableCell>
        <Typography variant="body2">{payout.bankName}</Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={t(palette.labelKey)}
          sx={{ bgcolor: palette.bg, color: palette.text, fontWeight: 700 }}
        />
        {payout.failureReason && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25 }}>
            {payout.failureReason}
          </Typography>
        )}
      </TableCell>
    </TableRow>
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
          {sign} {txn.amount.toLocaleString(i18n.language, { minimumFractionDigits: 2 })} {t('listing.currency')}
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
            {t('wallet.commissionFor')}{' '}
            {commission.listingTitle ||
              commission.listingReferenceCode ||
              `${commission.listingId.slice(0, 8)}…`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('wallet.agentShare')} {commission.agentCommissionAmount.toLocaleString(i18n.language)} ·{' '}
            {t('wallet.platformShare')} {commission.platformCommissionAmount.toLocaleString(i18n.language)}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
          {total.toLocaleString(i18n.language)} {t('listing.currency')}
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
