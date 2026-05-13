import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

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
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [activeCategory, setActiveCategory] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['home-listings', activeCategory],
    queryFn: () => listingsApi.getAll({
      transactionType: activeCategory || undefined,
      limit: 20,
    }),
  });

  const { data: featuredData } = useQuery({
    queryKey: ['featured'],
    queryFn: () => listingsApi.getFeatured(),
  });

  const listings = data?.data?.data || data?.data?.items || [];
  const featured = featuredData?.data?.data || featuredData?.data?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLogo}>عالمة</Text>
            <Text style={styles.headerTagline}>
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
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <Text style={styles.searchPlaceholder}>
            {isAr ? 'ابحث عن عقار، حي، مدينة...' : 'Search properties...'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                activeCategory === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setActiveCategory(cat.value)}
            >
              <Text style={[
                styles.categoryChipText,
                activeCategory === cat.value && styles.categoryChipTextActive,
              ]}>
                {isAr ? cat.labelAr : cat.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isAr ? '⭐ مميزة' : '⭐ Featured'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>
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
                <FeaturedCard
                  key={item.id}
                  item={item}
                  isAr={isAr}
                  onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isAr ? '🏠 أحدث العقارات' : '🏠 Latest Listings'}
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="large"
              style={{ marginVertical: 40 }}
            />
          ) : listings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {isAr ? 'لا توجد عقارات' : 'No listings found'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {listings.map((item: any) => (
                <ListingGridCard
                  key={item.id}
                  item={item}
                  isAr={isAr}
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

function FeaturedCard({ item, isAr, onPress }: any) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress}>
      <Image
        source={{ uri: item.coverImageUrl || '' }}
        style={styles.featuredImage}
        contentFit="cover"
        placeholder={{ uri: '' }}
      />
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>
            {item.transactionType === 'rent'
              ? (isAr ? 'إيجار' : 'Rent')
              : (isAr ? 'بيع' : 'Sale')}
          </Text>
        </View>
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredPrice}>
            {Number(item.price).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
          </Text>
          <Text style={styles.featuredTitle} numberOfLines={1}>
            {isAr ? item.titleAr : item.titleEn}
          </Text>
          <View style={styles.featuredLocation}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featuredLocationText}>
              {item.district}, {item.city}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ListingGridCard({ item, isAr, onPress }: any) {
  const cardWidth = (W - SIZES.lg * 2 - SIZES.sm) / 2;

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: cardWidth }]}
      onPress={onPress}
    >
      <View style={styles.gridImageBox}>
        {item.coverImageUrl ? (
          <Image
            source={{ uri: item.coverImageUrl }}
            style={styles.gridImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
            <Ionicons name="home" size={28} color={COLORS.primaryLight} />
          </View>
        )}
        <View style={[
          styles.gridBadge,
          { backgroundColor: item.transactionType === 'rent' ? COLORS.success : COLORS.primary }
        ]}>
          <Text style={styles.gridBadgeText}>
            {item.transactionType === 'rent'
              ? (isAr ? 'إيجار' : 'Rent')
              : (isAr ? 'بيع' : 'Sale')}
          </Text>
        </View>
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridPrice}>
          {Number(item.price).toLocaleString()}
          <Text style={styles.gridPriceCurrency}> {isAr ? 'ر.س' : 'SAR'}</Text>
        </Text>
        <Text style={styles.gridTitle} numberOfLines={1}>
          {isAr ? item.titleAr : item.titleEn}
        </Text>
        <View style={styles.gridLocation}>
          <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
          <Text style={styles.gridLocationText} numberOfLines={1}>
            {item.district}, {item.city}
          </Text>
        </View>
        {(item.bedrooms || item.bathrooms || item.area) && (
          <View style={styles.gridStats}>
            {item.bedrooms && (
              <View style={styles.gridStat}>
                <Ionicons name="bed-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.gridStatText}>{item.bedrooms}</Text>
              </View>
            )}
            {item.bathrooms && (
              <View style={styles.gridStat}>
                <Ionicons name="water-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.gridStatText}>{item.bathrooms}</Text>
              </View>
            )}
            {item.area && (
              <View style={styles.gridStat}>
                <Text style={styles.gridStatText}>{item.area}م²</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.lg, paddingBottom: SIZES.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  headerLogo: { fontSize: SIZES.h1, fontWeight: '900', color: '#FFF' },
  headerTagline: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  notifBtn: { padding: SIZES.sm, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: SIZES.borderRadiusFull },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: SIZES.borderRadiusFull, paddingHorizontal: SIZES.md, height: 46, gap: SIZES.sm },
  searchPlaceholder: { flex: 1, fontSize: SIZES.body, color: COLORS.textSecondary },
  categoriesWrapper: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoriesContent: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, gap: SIZES.sm },
  categoryChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  categoryChipTextActive: { color: '#FFF' },
  section: { paddingTop: SIZES.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.lg, marginBottom: SIZES.md },
  sectionTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: COLORS.text },
  seeAll: { fontSize: SIZES.body, color: COLORS.primary, fontWeight: '600' },
  featuredList: { paddingHorizontal: SIZES.lg, gap: SIZES.md },
  featuredCard: { width: W * 0.7, height: 200, borderRadius: SIZES.borderRadiusXl, overflow: 'hidden', ...SHADOWS.md },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: SIZES.md, backgroundColor: 'rgba(0,0,0,0.35)' },
  featuredBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.secondary, paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  featuredBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  featuredInfo: {},
  featuredPrice: { fontSize: SIZES.subtitle, fontWeight: '900', color: '#FFF' },
  featuredTitle: { fontSize: SIZES.body, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  featuredLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  featuredLocationText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIZES.lg, gap: SIZES.sm, paddingBottom: SIZES.xxxl },
  gridCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  gridImageBox: { position: 'relative' },
  gridImage: { width: '100%', height: 120 },
  gridImagePlaceholder: { backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  gridBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: SIZES.borderRadiusFull },
  gridBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  gridInfo: { padding: SIZES.sm },
  gridPrice: { fontSize: SIZES.body, fontWeight: '800', color: COLORS.primary },
  gridPriceCurrency: { fontSize: SIZES.small, fontWeight: '600' },
  gridTitle: { fontSize: SIZES.small, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  gridLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  gridLocationText: { fontSize: 10, color: COLORS.textSecondary, flex: 1 },
  gridStats: { flexDirection: 'row', gap: SIZES.sm, marginTop: 6 },
  gridStat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  gridStatText: { fontSize: 10, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.md },
});
