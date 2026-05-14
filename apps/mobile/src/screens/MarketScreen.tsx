import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { marketApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const PROPERTY_TYPES = [
  { ar: 'شقة', en: 'Apartment', value: 'apartment' },
  { ar: 'فيلا', en: 'Villa', value: 'villa' },
  { ar: 'أرض', en: 'Land', value: 'land' },
  { ar: 'تجاري', en: 'Commercial', value: 'commercial' },
];

export default function MarketScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const [city, setCity] = useState('Riyadh');
  const [type, setType] = useState('apartment');

  const trends = useQuery({
    queryKey: ['price-trends', city, type],
    queryFn: () => marketApi.trends(city, type),
  });

  const areas = useQuery({
    queryKey: ['area-insights', city],
    queryFn: () => marketApi.areaInsights(city),
  });

  const trendPoints: any[] =
    trends.data?.data?.data ||
    trends.data?.data ||
    trends.data?.points ||
    (Array.isArray(trends.data) ? trends.data : []);

  const districts: any[] =
    areas.data?.data?.data ||
    areas.data?.data ||
    areas.data?.districts ||
    (Array.isArray(areas.data) ? areas.data : []);

  const refetching = trends.isFetching || areas.isFetching;
  const onRefresh = () => {
    trends.refetch();
    areas.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'السوق' : 'Market'} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: SIZES.xs, textAlign }]}>
          {isAr ? 'المدينة' : 'City'}
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={isAr ? 'الرياض، جدة...' : 'Riyadh, Jeddah...'}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign },
          ]}
        />

        <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.md, marginBottom: SIZES.xs, textAlign }]}>
          {isAr ? 'نوع العقار' : 'Property type'}
        </Text>
        <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {PROPERTY_TYPES.map(t => {
            const active = type === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
                  {isAr ? t.ar : t.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.xl, marginBottom: SIZES.sm, textAlign }]}>
          {isAr ? 'اتجاه السعر (12 شهرًا)' : 'Price trend (12 months)'}
        </Text>
        {trends.isLoading ? (
          <LoadingSpinner inline />
        ) : trendPoints.length === 0 ? (
          <EmptyState icon="trending-up-outline" title={isAr ? 'لا توجد بيانات' : 'No data yet'} />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {trendPoints.slice(0, 12).map((p: any, idx: number) => (
              <View
                key={`${p.month || p.label || idx}`}
                style={[
                  styles.trendRow,
                  { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  idx === Math.min(11, trendPoints.length - 1) && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
                  {p.month || p.label || `#${idx + 1}`}
                </Text>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>
                  {Number(p.avgPrice || p.value || p.price || 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.xl, marginBottom: SIZES.sm, textAlign }]}>
          {isAr ? 'متوسط السعر/م² حسب الحي' : 'Avg ﷼/m² by district'}
        </Text>
        {areas.isLoading ? (
          <LoadingSpinner inline />
        ) : districts.length === 0 ? (
          <EmptyState icon="map-outline" title={isAr ? 'لا توجد بيانات' : 'No data yet'} />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {districts.slice(0, 20).map((d: any, idx: number) => (
              <View
                key={`${d.district || idx}`}
                style={[
                  styles.trendRow,
                  { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  idx === Math.min(19, districts.length - 1) && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[TYPOGRAPHY.body, { color: colors.text }]} numberOfLines={1}>
                  {d.district || d.name}
                </Text>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}>
                  {Number(d.avgPricePerM2 || d.avgPrice || 0).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, fontSize: SIZES.body, height: 44 },
  chipsRow: { gap: SIZES.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  card: { borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.lg, ...SHADOWS.sm },
  trendRow: { paddingVertical: SIZES.md, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
});
