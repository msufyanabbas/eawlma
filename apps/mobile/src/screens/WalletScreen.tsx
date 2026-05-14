import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { walletApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import PriceText from '../components/PriceText';

export default function WalletScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isRTL, textAlign } = useRTL();
  const { t } = useTranslation();

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance, isRefetching: bRefetching } =
    useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletApi.getBalance() });

  const { data: txData, refetch: refetchTx, isRefetching: txRefetching } =
    useQuery({ queryKey: ['wallet-transactions'], queryFn: () => walletApi.getTransactions() });

  // Backend GET /wallet/me returns { wallet: { balance, currency, ... }, recentTransactions }.
  // We tolerate a few alternate shapes so we don't blow up if the schema shifts.
  const balance =
    balanceData?.wallet?.balance ??
    balanceData?.data?.wallet?.balance ??
    balanceData?.data?.balance ??
    balanceData?.balance ??
    0;
  const currency =
    balanceData?.wallet?.currency ||
    balanceData?.data?.wallet?.currency ||
    balanceData?.currency ||
    'SAR';
  const recent: any[] = balanceData?.recentTransactions || balanceData?.data?.recentTransactions || [];
  const transactions: any[] = (() => {
    const candidates = [txData?.data?.data, txData?.data, txData?.items, txData];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return recent;
  })();
  void currency; // currency display is handled inside PriceText

  const onRefresh = () => {
    refetchBalance();
    refetchTx();
  };

  const handleDeposit = () => {
    Alert.alert(t('wallet.depositTitle'), t('wallet.inDevelopment'));
  };

  const handlePayout = () => {
    Alert.alert(t('wallet.payoutTitle'), t('wallet.inDevelopment'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('wallet.title')} onBack={() => navigation.goBack()} />
      <FlatList
        data={transactions}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingBottom: SIZES.xxxl }}
        refreshControl={
          <RefreshControl refreshing={bRefetching || txRefetching} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
              <Text style={[TYPOGRAPHY.body, { color: 'rgba(255,255,255,0.8)' }]}>
                {t('wallet.balance')}
              </Text>
              {balanceLoading ? (
                <LoadingSpinner inline />
              ) : (
                <PriceText
                  value={balance}
                  style={[TYPOGRAPHY.h1, { color: '#FFF', fontSize: 38, marginTop: SIZES.sm }]}
                  currencyStyle={[TYPOGRAPHY.h3, { color: '#FFF' }]}
                />
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleDeposit}>
                  <Ionicons name="arrow-down-circle-outline" size={20} color="#FFF" />
                  <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                    {t('wallet.deposit')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handlePayout}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
                  <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                    {t('wallet.withdraw')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginHorizontal: SIZES.lg, marginTop: SIZES.lg, marginBottom: SIZES.md, textAlign }]}>
              {t('wallet.transactions')}
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          const isCredit = item.type === 'credit' || item.amount > 0;
          return (
            <View style={[
              styles.txCard,
              { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}>
              <View style={[
                styles.txIcon,
                { backgroundColor: (isCredit ? colors.success : colors.error) + '15' }
              ]}>
                <Ionicons
                  name={isCredit ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={isCredit ? colors.success : colors.error}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>
                  {item.description || (isCredit ? t('wallet.txnDeposit') : t('wallet.withdrawal'))}
                </Text>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>
              <Text style={[
                TYPOGRAPHY.bodyBold,
                { color: isCredit ? colors.success : colors.error, fontWeight: '800' }
              ]}>
                {isCredit ? '+' : '-'}{Number(Math.abs(item.amount || 0)).toLocaleString()}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          !balanceLoading ? (
            <EmptyState
              icon="receipt-outline"
              title={t('wallet.noTransactions')}
              subtitle={t('wallet.noTransactionsHint')}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: { margin: SIZES.lg, padding: SIZES.xl, borderRadius: SIZES.borderRadiusXl, ...SHADOWS.lg },
  actionsRow: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md },
  txCard: { alignItems: 'center', gap: SIZES.md, marginHorizontal: SIZES.lg, marginBottom: SIZES.sm, padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
});
