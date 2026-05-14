import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import ListingCard, { getListingTitle } from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SmartImage from '../components/SmartImage';
import { listingCoverUrl } from '../utils/listingImages';

const { width: W } = Dimensions.get('window');

const CATEGORIES = [
  { labelAr: 'الكل', labelEn: 'All', value: '' },
  { labelAr: 'للبيع', labelEn: 'Sale', value: 'sale' },
  { labelAr: 'للإيجار', labelEn: 'Rent', value: 'rent' },
  { labelAr: 'شاليهات', labelEn: 'Chalets', value: 'chalet' },
  { labelAr: 'فلل', labelEn: 'Villas', value: 'villa' },
  { labelAr: 'شقق', labelEn: 'Apts', value: 'apartment' },
  { labelAr: 'أراضي', labelEn: 'Land', value: 'land' },
];

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const [activeCategory, setActiveCategory] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['home-listings', activeCategory],
    queryFn: () => {
      const params: Record<string, any> = { limit: 20 };
      // Categories are mixed: 'sale'/'rent' map to type, the rest to propertyTypes
      if (activeCategory === 'sale' || activeCategory === 'rent') {
        params.type = activeCategory;
      } else if (activeCategory) {
        params.propertyTypes = activeCategory;
      }
      return listingsApi.getAll(params);
    },
  });

  const { data: featuredData } = useQuery({
    queryKey: ['featured'],
    queryFn: () => listingsApi.getFeatured(),
  });

  const listings: any[] =
    data?.data?.data ||
    data?.data?.items ||
    data?.data ||
    [];
  const featured: any[] =
    featuredData?.data?.data ||
    featuredData?.data?.items ||
    featuredData?.data ||
    [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View>
            <Text style={[TYPOGRAPHY.h1, { color: '#FFF', textAlign }]}>عالمة</Text>
            <Text style={[TYPOGRAPHY.small, { color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign }]}>
              {isAr ? 'منصة العقارات الأولى' : 'Premier Real Estate'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <Text style={[TYPOGRAPHY.body, { flex: 1, color: colors.textSecondary, textAlign }]}>
            {isAr ? 'ابحث عن عقار، حي، مدينة...' : 'Search properties...'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.categoriesWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveCategory(cat.value)}
              >
                <Text style={[
                  TYPOGRAPHY.small,
                  { color: active ? '#FFF' : colors.textSecondary, fontWeight: '600' },
                ]}>
                  {isAr ? cat.labelAr : cat.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.quickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <QuickTile
            icon="bed-outline"
            label={isAr ? 'الإقامات' : 'Stays'}
            colors={colors}
            onPress={() => navigation.navigate('Stays')}
          />
          <QuickTile
            icon="business-outline"
            label={isAr ? 'الفنادق' : 'Hotels'}
            colors={colors}
            onPress={() => navigation.navigate('Hotels')}
          />
          <QuickTile
            icon="people-outline"
            label={isAr ? 'الوكلاء' : 'Agents'}
            colors={colors}
            onPress={() => navigation.navigate('AgentsList')}
          />
          <QuickTile
            icon="trending-up-outline"
            label={isAr ? 'السوق' : 'Market'}
            colors={colors}
            onPress={() => navigation.navigate('Market')}
          />
          <QuickTile
            icon="heart-outline"
            label={isAr ? 'محفوظات' : 'Saved'}
            colors={colors}
            onPress={() => navigation.navigate('Saved')}
          />
        </ScrollView>

        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[TYPOGRAPHY.h4, { color: colors.text, textAlign }]}>
                {isAr ? '⭐ مميزة' : '⭐ Featured'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={[TYPOGRAPHY.body, { color: colors.primary, fontWeight: '600' }]}>
                  {isAr ? 'عرض الكل' : 'See all'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            >
              {featured.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featuredCard}
                  onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                >
                  <SmartImage
                    uri={listingCoverUrl(item)}
                    style={styles.featuredImage}
                    fallbackIconSize={48}
                  />
                  <View style={styles.featuredOverlay}>
                    <View style={[styles.featuredBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[TYPOGRAPHY.caption, { color: '#FFF', fontWeight: '800' }]}>
                        {item.transactionType === 'rent'
                          ? (isAr ? 'إيجار' : 'Rent')
                          : (isAr ? 'بيع' : 'Sale')}
                      </Text>
                    </View>
                    <View>
                      <Text style={[TYPOGRAPHY.h4, { color: '#FFF' }]}>
                        {Number(item.price || 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                      </Text>
                      <Text
                        style={[TYPOGRAPHY.body, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}
                        numberOfLines={1}
                      >
                        {getListingTitle(item, isAr)}
                      </Text>
                      <View style={styles.featuredLocation}>
                        <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={[TYPOGRAPHY.caption, { color: 'rgba(255,255,255,0.8)' }]}>
                          {[item.district, item.city].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[TYPOGRAPHY.h4, { color: colors.text, textAlign }]}>
              {isAr ? '🏠 أحدث العقارات' : '🏠 Latest Listings'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={[TYPOGRAPHY.body, { color: colors.primary, fontWeight: '600' }]}>
                {isAr ? 'عرض الكل' : 'See all'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingSpinner inline />
          ) : listings.length === 0 ? (
            <EmptyState
              icon="home-outline"
              title={isAr ? 'لا توجد عقارات' : 'No listings found'}
            />
          ) : (
            <View style={styles.grid}>
              {listings.map((item: any) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  variant="grid"
                  onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickTile({ icon, label, colors, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.quickTile, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[TYPOGRAPHY.caption, { color: colors.text, fontWeight: '600', marginTop: 4, textAlign: 'center' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.lg },
  headerTop: { justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  notifBtn: { padding: SIZES.sm, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: SIZES.borderRadiusFull },
  searchBar: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: SIZES.borderRadiusFull, paddingHorizontal: SIZES.md, height: 46, gap: SIZES.sm },
  categoriesWrapper: { borderBottomWidth: 1 },
  categoriesContent: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, gap: SIZES.sm },
  categoryChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1.5 },
  quickRow: { paddingHorizontal: SIZES.lg, paddingTop: SIZES.lg, gap: SIZES.sm },
  quickTile: { width: 88, alignItems: 'center', paddingVertical: SIZES.md, paddingHorizontal: SIZES.sm, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  section: { paddingTop: SIZES.lg },
  sectionHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.lg, marginBottom: SIZES.md },
  featuredList: { paddingHorizontal: SIZES.lg, gap: SIZES.md },
  featuredCard: { width: W * 0.7, height: 200, borderRadius: SIZES.borderRadiusXl, overflow: 'hidden', ...SHADOWS.md },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: SIZES.md, backgroundColor: 'rgba(0,0,0,0.35)' },
  featuredBadge: { alignSelf: 'flex-start', paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  featuredLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIZES.lg, gap: SIZES.sm, paddingBottom: SIZES.xxxl },
});
