// WalletScreen — purple gradient balance hero, deposit/payout action sheets,
// and a tabbed transaction / payout history list. The deposit flow is a stub
// that hits `/wallet/deposit`; in production this opens Moyasar's web view.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Animated } from 'react-native';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { Header } from '@/components/Header';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, extractErrorMessage } from '@/api';

interface WalletTxn {
  id: string;
  type: 'deposit' | 'withdrawal' | 'commission_payment' | 'commission_received' | 'refund' | string;
  label?: string;
  amount: number;
  direction: 'credit' | 'debit';
  createdAt: string;
  status?: string;
}

interface WalletResponse {
  balance: number;
  transactions: WalletTxn[];
  payouts?: Array<{ id: string; amount: number; status: string; createdAt: string }>;
}

const TXN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  deposit: 'arrow-down-circle-outline',
  withdrawal: 'arrow-up-circle-outline',
  commission_payment: 'cash-outline',
  commission_received: 'wallet-outline',
  refund: 'return-up-back-outline',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

export function WalletScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'txns' | 'payouts'>('txns');
  const [openDeposit, setOpenDeposit] = useState(false);
  const [openPayout, setOpenPayout] = useState(false);

  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: async (): Promise<WalletResponse> => {
      const { data } = await apiClient.get<WalletResponse>('/wallet');
      return data;
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['wallet'] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={t('wallet.title')} />

      <FlatList
        data={tab === 'txns' ? wallet.data?.transactions ?? [] : []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Balance card */}
            <Animated.View style={[styles.balanceCard, SHADOWS.lg]}>
              <Text style={styles.balanceLabel}>{t('wallet.yourBalance')}</Text>
              <Text style={styles.balanceValue}>
                {wallet.isLoading ? '…' : (wallet.data?.balance ?? 0).toLocaleString()}{' '}
                <Text style={styles.balanceCurrency}>{t('listing.currency')}</Text>
              </Text>
              <View style={styles.balanceActions}>
                <Pressable
                  style={styles.balanceBtn}
                  onPress={() => setOpenDeposit(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
                  <Text style={styles.balanceBtnText}>{t('wallet.addFunds')}</Text>
                </Pressable>
                <Pressable
                  style={styles.balanceBtn}
                  onPress={() => setOpenPayout(true)}
                >
                  <Ionicons name="cash-outline" size={18} color={COLORS.white} />
                  <Text style={styles.balanceBtnText}>{t('wallet.requestPayout')}</Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TabBtn label={t('wallet.transactions')} active={tab === 'txns'} onPress={() => setTab('txns')} />
              <TabBtn label={t('wallet.payoutHistory')} active={tab === 'payouts'} onPress={() => setTab('payouts')} />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TxnRow txn={item} />
        )}
        ListEmptyComponent={
          wallet.isLoading ? (
            <View style={styles.center}>
              <BrandSpinner size={28} />
            </View>
          ) : tab === 'txns' ? (
            <EmptyState icon="wallet-outline" title={t('wallet.noTransactions')} />
          ) : (
            <View>
              {(wallet.data?.payouts ?? []).length === 0 ? (
                <EmptyState icon="cash-outline" title={t('wallet.noPayouts')} />
              ) : (
                (wallet.data?.payouts ?? []).map((p) => (
                  <View key={p.id} style={[styles.txnRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txnLabel, { color: colors.text }]}>{p.amount.toLocaleString()} {t('listing.currency')}</Text>
                      <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
                        {formatDate(p.createdAt)} · {t(`wallet.payoutStatus.${p.status}`, { defaultValue: p.status })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )
        }
      />

      {/* Deposit sheet */}
      <BottomSheet open={openDeposit} onClose={() => setOpenDeposit(false)} heightFraction={0.5}>
        <DepositForm
          onClose={() => setOpenDeposit(false)}
          onSuccess={() => {
            setOpenDeposit(false);
            refetch();
          }}
        />
      </BottomSheet>

      {/* Payout sheet */}
      <BottomSheet open={openPayout} onClose={() => setOpenPayout(false)} heightFraction={0.85}>
        <PayoutForm
          maxAmount={wallet.data?.balance ?? 0}
          onClose={() => setOpenPayout(false)}
          onSuccess={() => {
            setOpenPayout(false);
            refetch();
          }}
        />
      </BottomSheet>
    </View>
  );
}

function TxnRow({ txn }: { txn: WalletTxn }) {
  const colors = useColors();
  const isCredit = txn.direction === 'credit';
  const icon = TXN_ICONS[txn.type] ?? 'swap-horizontal-outline';
  return (
    <View style={[styles.txnRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.txnIcon, { backgroundColor: isCredit ? '#E8F8EE' : '#FDECEC' }]}>
        <Ionicons name={icon} size={18} color={isCredit ? COLORS.success : COLORS.error} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txnLabel, { color: colors.text }]} numberOfLines={1}>
          {txn.label ?? txn.type}
        </Text>
        <Text style={[styles.txnDate, { color: colors.textSecondary }]}>
          {formatDate(txn.createdAt)}
        </Text>
      </View>
      <Text
        style={[
          styles.txnAmount,
          { color: isCredit ? COLORS.success : COLORS.error },
        ]}
      >
        {isCredit ? '+' : '-'}
        {Math.abs(txn.amount).toLocaleString()}
      </Text>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabBtn, active && { borderBottomColor: COLORS.primary }]}
    >
      <Text
        style={[
          styles.tabText,
          { color: active ? COLORS.primary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DepositForm({ onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const colors = useColors();
  const [amount, setAmount] = useState('');
  const m = useMutation({
    mutationFn: () => apiClient.post('/wallet/deposit', { amount: Number(amount) }),
    onSuccess,
    onError: (e) => Alert.alert(t('common.error'), extractErrorMessage(e)),
  });

  const invalid = !amount || Number(amount) <= 0;

  return (
    <View>
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('wallet.addFunds')}</Text>
      <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>{t('wallet.depositHint')}</Text>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.amount')}</Text>
      <TextInput
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: invalid && amount ? COLORS.error : colors.border },
        ]}
      />
      <Pressable
        style={[styles.primaryBtn, { opacity: invalid ? 0.5 : 1 }]}
        disabled={invalid || m.isPending}
        onPress={() => m.mutate()}
      >
        {m.isPending ? <BrandSpinner size={18} /> : <Text style={styles.primaryBtnText}>{t('wallet.deposit')}</Text>}
      </Pressable>
    </View>
  );
}

function PayoutForm({
  maxAmount,
  onSuccess,
}: {
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [beneficiary, setBeneficiary] = useState('');

  const ibanInvalid = iban.length > 0 && !/^SA\d{22}$/.test(iban.toUpperCase());
  const amountInvalid = !amount || Number(amount) < 100 || Number(amount) > maxAmount;

  const m = useMutation({
    mutationFn: () =>
      apiClient.post('/payouts', {
        amount: Number(amount),
        iban: iban.toUpperCase(),
        bankName,
        beneficiaryName: beneficiary,
      }),
    onSuccess: () => {
      Alert.alert(t('common.confirm'), t('wallet.payoutSuccess'));
      onSuccess();
    },
    onError: (e) => Alert.alert(t('common.error'), extractErrorMessage(e)),
  });

  return (
    <View>
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('wallet.requestPayout')}</Text>

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('wallet.payoutAmount')}</Text>
      <TextInput
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: amountInvalid && amount ? COLORS.error : colors.border }]}
      />
      {amountInvalid && amount ? <Text style={styles.errorText}>{t('wallet.minPayout')}</Text> : null}

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('wallet.ibanNumber')}</Text>
      <TextInput
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: ibanInvalid ? COLORS.error : colors.border }]}
      />
      {ibanInvalid ? <Text style={styles.errorText}>{t('wallet.ibanFormat')}</Text> : null}

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('wallet.bankName')}</Text>
      <TextInput
        value={bankName}
        onChangeText={setBankName}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
      />

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('wallet.beneficiaryName')}</Text>
      <TextInput
        value={beneficiary}
        onChangeText={setBeneficiary}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
      />

      <Pressable
        style={[styles.primaryBtn, { opacity: amountInvalid || ibanInvalid || !bankName || !beneficiary ? 0.5 : 1 }]}
        disabled={amountInvalid || ibanInvalid || !bankName || !beneficiary || m.isPending}
        onPress={() => m.mutate()}
      >
        {m.isPending ? <BrandSpinner size={18} /> : <Text style={styles.primaryBtnText}>{t('common.submit')}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.huge },
  center: { paddingVertical: SIZES.huge, alignItems: 'center' },
  balanceCard: {
    backgroundColor: COLORS.primary,
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadiusXl,
    padding: SIZES.xl,
  },
  balanceLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: 'rgba(255,255,255,0.85)',
  },
  balanceValue: {
    fontFamily: FONTS.extraBold,
    fontSize: SIZES.h1,
    color: COLORS.white,
    marginTop: SIZES.xs,
  },
  balanceCurrency: { fontSize: SIZES.bodyLg, fontFamily: FONTS.medium },
  balanceActions: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.lg },
  balanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SIZES.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: SIZES.borderRadius,
  },
  balanceBtnText: { fontFamily: FONTS.bold, fontSize: SIZES.small, color: COLORS.white },
  tabRow: {
    flexDirection: 'row',
    gap: SIZES.lg,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  tabBtn: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontFamily: FONTS.bold, fontSize: SIZES.body },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
    marginBottom: SIZES.sm,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnLabel: { fontFamily: FONTS.medium, fontSize: SIZES.body, textTransform: 'capitalize' },
  txnDate: { fontFamily: FONTS.regular, fontSize: SIZES.caption, marginTop: 2 },
  txnAmount: { fontFamily: FONTS.bold, fontSize: SIZES.body },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: SIZES.subtitle },
  sheetHint: { fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: 4 },
  fieldLabel: { fontFamily: FONTS.medium, fontSize: SIZES.small, marginTop: SIZES.md, marginBottom: SIZES.xs },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },
  errorText: { color: COLORS.error, fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: SIZES.xs },
  primaryBtn: {
    marginTop: SIZES.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.white },
});
