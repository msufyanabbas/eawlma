import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function StaysScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isRTL, textAlign } = useRTL();
  const { t } = useTranslation();

  const STAY_TYPES = [
    { label: t('stays.typeAll'), value: 'chalet,farm,rest_house,hotel_room' },
    { label: t('stays.chalets'), value: 'chalet' },
    { label: t('stays.farms'), value: 'farm' },
    { label: t('stays.restHouses'), value: 'rest_house' },
    { label: t('stays.hotelsLabel'), value: 'hotel_room' },
  ];

  const [propType, setPropType] = useState(STAY_TYPES[0].value);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stays', propType],
    queryFn: () => listingsApi.search({
      propertyTypes: propType,
      type: 'rent',
      rentalType: 'short_term',
      limit: 30,
    }),
  });

  const listings: any[] =
    data?.data?.data || data?.data?.items || data?.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('nav.stays')} onBack={() => navigation.goBack()} />

      <View style={[styles.intro, { backgroundColor: colors.primary }]}>
        <Text style={[TYPOGRAPHY.h3, { color: '#FFF', textAlign }]}>
          {t('stays.bookNext')}
        </Text>
        <Text style={[TYPOGRAPHY.body, { color: 'rgba(255,255,255,0.85)', marginTop: SIZES.xs, textAlign }]}>
          {t('stays.subtitleMix')}
        </Text>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {STAY_TYPES.map(opt => {
            const active = propType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setPropType(opt.value)}
              >
                <Text style={[
                  TYPOGRAPHY.small,
                  { color: active ? '#FFF' : colors.textSecondary, fontWeight: '600' },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {listings.length === 0 ? (
            <EmptyState
              icon="bed-outline"
              title={t('stays.noStays')}
              subtitle={t('stays.tryAnother')}
            />
          ) : (
            <View style={styles.grid}>
              {listings.map(item => (
                <ListingCard
                  key={item.id}
                  item={item}
                  variant="grid"
                  onPress={() =>
                    navigation.navigate('Booking', { listingId: item.id, listing: item })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { padding: SIZES.lg },
  filterRow: { borderBottomWidth: 1 },
  chipsRow: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, gap: SIZES.sm },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
});
