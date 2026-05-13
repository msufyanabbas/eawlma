import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

export default function WalletScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.get('/wallet').then(r => r.data),
  });

  const { data: txData } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => api.get('/wallet/transactions').then(r => r.data),
  });

  const balance = balanceData?.data?.balance ?? balanceData?.balance ?? 0;
  const currency = balanceData?.data?.currency || 'SAR';
  const transactions = txData?.data?.data || txData?.data || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons
            name={isAr ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAr ? 'المحفظة' : 'Wallet'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            {isAr ? 'الرصيد الحالي' : 'Current Balance'}
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#FFF" size="large" style={{ marginTop: SIZES.md }} />
          ) : (
            <Text style={styles.balanceValue}>
              {Number(balance).toLocaleString()}
              <Text style={styles.balanceCurrency}> {isAr && currency === 'SAR' ? 'ر.س' : currency}</Text>
            </Text>
          )}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="arrow-down-circle-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>
                {isAr ? 'إيداع' : 'Deposit'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>
                {isAr ? 'سحب' : 'Withdraw'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isAr ? 'سجل المعاملات' : 'Transaction History'}
          </Text>
          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {isAr ? 'لا توجد معاملات' : 'No transactions'}
              </Text>
            </View>
          ) : (
            transactions.map((tx: any) => (
              <View key={tx.id} style={styles.txCard}>
                <View style={[
                  styles.txIcon,
                  { backgroundColor: tx.type === 'credit' ? COLORS.success + '15' : COLORS.error + '15' }
                ]}>
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={tx.type === 'credit' ? COLORS.success : COLORS.error}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>
                    {tx.description || (tx.type === 'credit' ? (isAr ? 'إيداع' : 'Deposit') : (isAr ? 'سحب' : 'Withdrawal'))}
                  </Text>
                  <Text style={styles.txDate}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'credit' ? COLORS.success : COLORS.error }
                ]}>
                  {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: SIZES.lg },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: '#FFF' },
  balanceCard: { backgroundColor: COLORS.primary, margin: SIZES.lg, padding: SIZES.xl, borderRadius: SIZES.borderRadiusXl, ...SHADOWS.lg },
  balanceLabel: { fontSize: SIZES.body, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balanceValue: { fontSize: 38, fontWeight: '900', color: '#FFF', marginTop: SIZES.sm },
  balanceCurrency: { fontSize: SIZES.title, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: SIZES.body },
  section: { padding: SIZES.lg },
  sectionTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: COLORS.text, marginBottom: SIZES.md },
  empty: { alignItems: 'center', padding: SIZES.xxxl },
  emptyText: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.md },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, backgroundColor: COLORS.surface, padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  txDate: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  txAmount: { fontSize: SIZES.bodyLg, fontWeight: '800' },
});
