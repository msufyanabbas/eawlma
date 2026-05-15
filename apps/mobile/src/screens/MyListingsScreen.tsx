import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartImage from '../components/SmartImage';
import { listingCoverUrl } from '../utils/listingImages';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import PriceText from '../components/PriceText';

export default function MyListingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { t } = useTranslation();
  const [status, setStatus] = useState('');

  const STATUSES = [
    { label: t('search.all'), value: '' },
    { label: t('listing.status.active'), value: 'active' },
    { label: t('listing.status.pending'), value: 'pending_review' },
    { label: t('listing.status.expired'), value: 'expired' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsApi.getMine(),
  });

  const all: any[] = data?.data?.data || data?.data?.items || data?.data || [];
  const listings = status ? all.filter(l => l.status === status) : all;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={t('profile.myListings')}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('AddListing')} hitSlop={8}>
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        contentContainerStyle={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: SIZES.sm,
          paddingHorizontal: SIZES.lg,
          paddingVertical: SIZES.sm,
        }}
      >
        {STATUSES.map(s => {
          const active = status === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.statusChip,
                { borderColor: colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setStatus(s.value)}
            >
              <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.textSecondary, fontWeight: '600' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: SIZES.lg, gap: SIZES.sm, paddingBottom: SIZES.xxxl }}
          renderItem={({ item }: any) => (
            <View style={[styles.card, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={styles.thumbBox}
                onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
              >
                <SmartImage uri={listingCoverUrl(item)} style={styles.thumb} fallbackIconSize={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.info}
                onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]} numberOfLines={1}>
                  {isAr ? (item.titleAr || item.titleEn) : (item.titleEn || item.titleAr)}
                </Text>
                <PriceText
                  value={item.price}
                  style={[TYPOGRAPHY.subtitle, { color: colors.primary, fontWeight: '900', marginTop: 4 }]}
                  currencyStyle={TYPOGRAPHY.small}
                />
                <Text style={[TYPOGRAPHY.small, { color: colors.success, marginTop: 4, fontWeight: '600' }]}>
                  {item.status === 'active' || item.status === 'published'
                    ? `● ${t('listing.status.active')}`
                    : `● ${item.status}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editBtn, { borderLeftColor: colors.divider }]}
                onPress={() => navigation.navigate('EditListing', { id: item.id })}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              title={t('empty.noListings')}
              actionLabel={t('profile.addListing')}
              onAction={() => navigation.navigate('AddListing')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: { borderBottomWidth: 1, maxHeight: 56, flexGrow: 0 },
  statusChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  card: { borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  thumbBox: { width: 100, height: 100 },
  thumb: { width: '100%', height: '100%' },
  info: { flex: 1, padding: SIZES.md, justifyContent: 'center' },
  editBtn: { width: 44, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1 },
});
