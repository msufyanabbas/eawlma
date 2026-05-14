import React from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { commissionsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import PriceText from '../components/PriceText';

type Status = 'pending' | 'confirmed' | 'paid' | 'cancelled' | string;

export default function CommissionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['commissions-mine'],
    queryFn: () => commissionsApi.myCommissions(),
  });

  const items: any[] = data?.data?.data || data?.data || [];

  const statusMeta = (s: Status) => {
    switch (s) {
      case 'confirmed':
        return { color: colors.success, labelAr: 'مؤكدة', labelEn: 'Confirmed' };
      case 'paid':
        return { color: colors.primary, labelAr: 'مدفوعة', labelEn: 'Paid' };
      case 'cancelled':
        return { color: colors.error, labelAr: 'ملغاة', labelEn: 'Cancelled' };
      case 'pending':
      default:
        return { color: colors.warning, labelAr: 'معلّقة', labelEn: 'Pending' };
    }
  };

  const totalEarned = items
    .filter(i => i.status === 'paid' || i.status === 'confirmed')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'العمولات' : 'Commissions'} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View style={[styles.summary, { backgroundColor: colors.primary }]}>
              <Text style={[TYPOGRAPHY.body, { color: 'rgba(255,255,255,0.85)' }]}>
                {isAr ? 'إجمالي العمولات المكتسبة' : 'Total Earned'}
              </Text>
              <PriceText
                value={totalEarned}
                style={[TYPOGRAPHY.h1, { color: '#FFF', fontSize: 36, marginTop: SIZES.xs }]}
                currencyStyle={[TYPOGRAPHY.h3, { color: '#FFF' }]}
              />
              <Text style={[TYPOGRAPHY.small, { color: 'rgba(255,255,255,0.75)', marginTop: SIZES.sm }]}>
                {isAr
                  ? `من ${items.length} عملية`
                  : `from ${items.length} transactions`}
              </Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const meta = statusMeta(item.status);
            const title = item.listingTitleAr && isAr
              ? item.listingTitleAr
              : item.listingTitleEn || item.listing?.titleAr || item.listing?.titleEn || (isAr ? 'عمولة' : 'Commission');
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, textAlign }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: meta.color + '20' }]}>
                    <Text style={[TYPOGRAPHY.caption, { color: meta.color, fontWeight: '800', textTransform: 'uppercase' }]}>
                      {isAr ? meta.labelAr : meta.labelEn}
                    </Text>
                  </View>
                </View>

                {item.transactionValue != null && (
                  <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>
                      {isAr ? 'قيمة الصفقة' : 'Deal value'}
                    </Text>
                    <PriceText
                      value={item.transactionValue}
                      style={[TYPOGRAPHY.small, { color: colors.text, fontWeight: '600' }]}
                      currencyStyle={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}
                    />
                  </View>
                )}

                <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>
                    {isAr ? 'العمولة' : 'Commission'}
                  </Text>
                  <PriceText
                    value={item.amount}
                    style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}
                    currencyStyle={TYPOGRAPHY.small}
                  />
                </View>

                {item.createdAt && (
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textLight, marginTop: SIZES.sm, textAlign }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={isAr ? 'لا توجد عمولات' : 'No commissions yet'}
              subtitle={isAr ? 'ستظهر العمولات هنا بعد إغلاق الصفقات' : 'Earnings will appear after closing deals'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { margin: SIZES.lg, padding: SIZES.xl, borderRadius: SIZES.borderRadiusXl, ...SHADOWS.lg },
  card: { marginHorizontal: SIZES.lg, marginBottom: SIZES.sm, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  cardHeader: { alignItems: 'center', justifyContent: 'space-between', gap: SIZES.sm, marginBottom: SIZES.sm },
  badge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  row: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
});
