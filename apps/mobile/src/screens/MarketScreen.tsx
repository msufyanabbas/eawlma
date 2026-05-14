import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { marketApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function MarketScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isRTL, textAlign } = useRTL();
  const { t } = useTranslation();
  const [city, setCity] = useState('Riyadh');
  const [type, setType] = useState('apartment');

  const PROPERTY_TYPES = [
    { label: t('propertyTypes.apartment'), value: 'apartment' },
    { label: t('propertyTypes.villa'), value: 'villa' },
    { label: t('propertyTypes.land'), value: 'land' },
    { label: t('propertyTypes.commercial'), value: 'commercial' },
  ];

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
      <Header title={t('nav.market')} onBack={() => navigation.goBack()} />
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
          {t('market.city')}
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t('market.cityPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign },
          ]}
        />

        <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.md, marginBottom: SIZES.xs, textAlign }]}>
          {t('market.propertyType')}
        </Text>
        <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {PROPERTY_TYPES.map(opt => {
            const active = type === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.xl, marginBottom: SIZES.sm, textAlign }]}>
          {t('market.trendTitle')}
        </Text>
        {trends.isLoading ? (
          <LoadingSpinner inline />
        ) : trendPoints.length === 0 ? (
          <EmptyState icon="trending-up-outline" title={t('market.noData')} />
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
                  {Number(p.avgPrice || p.value || p.price || 0).toLocaleString()} {t('common.sar')}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.xl, marginBottom: SIZES.sm, textAlign }]}>
          {t('market.avgByDistrict')}
        </Text>
        {areas.isLoading ? (
          <LoadingSpinner inline />
        ) : districts.length === 0 ? (
          <EmptyState icon="map-outline" title={t('market.noData')} />
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
