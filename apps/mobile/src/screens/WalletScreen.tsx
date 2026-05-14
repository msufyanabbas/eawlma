import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
  const { isAr, isRTL, textAlign } = useRTL();

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance, isRefetching: bRefetching } =
    useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletApi.getBalance() });

  const { data: txData, refetch: refetchTx, isRefetching: txRefetching } =
    useQuery({ queryKey: ['wallet-transactions'], queryFn: () => walletApi.getTransactions() });

  const balance = balanceData?.data?.balance ?? balanceData?.balance ?? 0;
  const currency = balanceData?.data?.currency || balanceData?.currency || 'SAR';
  const transactions: any[] = txData?.data?.data || txData?.data || [];

  const onRefresh = () => {
    refetchBalance();
    refetchTx();
  };

  const handleDeposit = () => {
    Alert.alert(
      isAr ? 'إيداع' : 'Deposit',
      isAr ? 'هذه الخاصية قيد التطوير' : 'This feature is in development'
    );
  };

  const handlePayout = () => {
    Alert.alert(
      isAr ? 'سحب' : 'Payout',
      isAr ? 'هذه الخاصية قيد التطوير' : 'This feature is in development'
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'المحفظة' : 'Wallet'} onBack={() => navigation.goBack()} />
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
                {isAr ? 'الرصيد الحالي' : 'Current Balance'}
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
                    {isAr ? 'إيداع' : 'Deposit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handlePayout}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
                  <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                    {isAr ? 'سحب' : 'Payout'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginHorizontal: SIZES.lg, marginTop: SIZES.lg, marginBottom: SIZES.md, textAlign }]}>
              {isAr ? 'سجل المعاملات' : 'Transaction History'}
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
                  {item.description || (isCredit ? (isAr ? 'إيداع' : 'Deposit') : (isAr ? 'سحب' : 'Withdrawal'))}
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
              title={isAr ? 'لا توجد معاملات' : 'No transactions'}
              subtitle={isAr ? 'ستظهر معاملاتك هنا' : 'Your transactions will appear here'}
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
