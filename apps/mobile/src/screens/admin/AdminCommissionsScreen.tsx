import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  paid: '#22C55E',
  disputed: '#EF4444',
  cancelled: '#9CA3AF',
};

export default function AdminCommissionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon, textAlign } = useRTL();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: () => api.get('/commissions/admin').then(r => r.data),
  });

  const commissions: any[] = data?.data?.data ?? data?.data ?? data?.items ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.commissions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={commissions}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => {
          const status = (item.status || 'pending').toLowerCase();
          const color = STATUS_COLORS[status] || colors.primary;
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.amount, { color: colors.text, textAlign }]}>
                  {Number(item.commissionAmount ?? item.amount ?? 0).toLocaleString()} {t('common.sar')}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {t(`commission.status.${status}`)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]} numberOfLines={1}>
                {t('commission.dealValue')}: {Number(item.transactionValue ?? 0).toLocaleString()} {t('common.sar')}
              </Text>
              {item.createdAt && (
                <Text style={[styles.meta, { color: colors.textLight, textAlign }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.md }]}>
                {t('commission.noCommissionsTitle')}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.title, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  card: { padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  cardRow: { alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: SIZES.bodyLg, fontFamily: 'Tajawal_800ExtraBold' },
  statusPill: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  meta: { fontSize: SIZES.small, marginTop: 4, fontFamily: 'Tajawal_400Regular' },
  empty: { alignItems: 'center', paddingVertical: 60 },
});
