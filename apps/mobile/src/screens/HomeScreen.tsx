// HomeScreen — the marquee surface of the app. Layout: a tall purple hero
// (custom, not the shared Header — we want a search bar that visually sits at
// the bottom edge of the hero and bleeds into the white surface below), then
// a white scroll surface containing category chips, a horizontal carousel of
// featured listings, a 2x2 grid of popular cities, and finally a vertical
// feed of recent listings. Sections fade-in with a small stagger so the page
// feels alive on cold start. Pull-to-refresh refetches featured + recent in
// parallel.
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { SearchBar } from '@/components/SearchBar';
import { ListingCard } from '@/components/ListingCard';
import { BrandSpinner } from '@/components/LoadingScreen';
import { listingsApi } from '@/api';
import type { Listing } from '@/api/listings.api';
import { useAuthStore } from '@/store/auth.store';
import type { RootStackParamList, TabsParamList } from '@/navigation/types';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

type CategoryKey = 'all' | 'apartment' | 'villa' | 'office' | 'land';

interface Category {
  key: CategoryKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: Category[] = [
  { key: 'all', labelKey: 'home.tabBuy', icon: 'grid-outline' },
  { key: 'apartment', labelKey: 'propertyTypes.apartment', icon: 'business-outline' },
  { key: 'villa', labelKey: 'propertyTypes.villa', icon: 'home-outline' },
  { key: 'office', labelKey: 'propertyTypes.office', icon: 'briefcase-outline' },
  { key: 'land', labelKey: 'propertyTypes.land', icon: 'map-outline' },
];

interface CityTile {
  key: string;
  name: string;
  nameAr: string;
  image: string;
}

// Saudi city photos hosted on Unsplash — purely decorative placeholders.
const CITIES: CityTile[] = [
  {
    key: 'Riyadh',
    name: 'Riyadh',
    nameAr: 'الرياض',
    image:
      'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=70',
  },
  {
    key: 'Jeddah',
    name: 'Jeddah',
    nameAr: 'جدة',
    image:
      'https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=600&q=70',
  },
  {
    key: 'Dammam',
    name: 'Dammam',
    nameAr: 'الدمام',
    image:
      'https://images.unsplash.com/photo-1614107151491-6876eecbff89?auto=format&fit=crop&w=600&q=70',
  },
  {
    key: 'Mecca',
    name: 'Mecca',
    nameAr: 'مكة المكرمة',
    image:
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=70',
  },
];

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [category, setCategory] = useState<CategoryKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const isArabic = i18n.language?.startsWith('ar');

  const featured = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: () => listingsApi.featured(),
  });

  const recentParams = useMemo(
    () => ({
      page: 1,
      limit: 10,
      ...(category !== 'all' ? { propertyType: category } : {}),
    }),
    [category],
  );

  const recent = useQuery({
    queryKey: ['listings', 'recent', recentParams],
    queryFn: () => listingsApi.search(recentParams),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['listings', 'featured'] }),
      queryClient.invalidateQueries({ queryKey: ['listings', 'recent'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const handleSubmitSearch = (text: string) => {
    navigation.navigate('Search', { initialQuery: text });
  };

  const openListing = (id: string) => {
    navigation.navigate('ListingDetail', { id });
  };

  const openCitySearch = (city: string) => {
    navigation.navigate('Search', { initialQuery: city });
  };

  const greetingKey = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'common.goodMorning';
    if (h < 18) return 'common.goodAfternoon';
    return 'common.goodEvening';
  })();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Purple hero */}
      <View style={[styles.hero, { paddingTop: insets.top + SIZES.md }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>{t('app.name', { defaultValue: 'Eawlma' })}</Text>
            {user?.fullName ? (
              <Text style={styles.greeting} numberOfLines={1}>
                {t(greetingKey, { defaultValue: 'Hello' })}, {user.fullName.split(' ')[0]}
              </Text>
            ) : (
              <Text style={styles.greeting} numberOfLines={1}>
                {t('home.heroSubtitle', { defaultValue: 'Find your next home' })}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={styles.bellButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.heroTitle}
        >
          {t('home.heroTitle', { defaultValue: 'Discover the perfect place to call home' })}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.searchWrap}>
          <SearchBar
            placeholder={t('home.searchPlaceholder', { defaultValue: 'Search city, district…' })}
            onSubmit={handleSubmitSearch}
          />
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Category chips */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? COLORS.primary : colors.surface,
                      borderColor: active ? COLORS.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={active ? COLORS.white : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? COLORS.white : colors.text },
                    ]}
                  >
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Featured carousel */}
        <Animated.View
          entering={FadeInDown.delay(280).duration(400)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('home.featuredListings')}
            </Text>
            <Pressable onPress={() => navigation.navigate('Search')} hitSlop={8}>
              <Text style={styles.viewMore}>{t('home.viewMore')}</Text>
            </Pressable>
          </View>

          {featured.isLoading ? (
            <CarouselSkeleton />
          ) : (featured.data?.length ?? 0) === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('search.noResults')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={featured.data ?? []}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselList}
              renderItem={({ item }) => (
                <ListingCard
                  listing={item}
                  variant="carousel"
                  onPress={() => openListing(item.id)}
                />
              )}
            />
          )}
        </Animated.View>

        {/* Popular cities — 2x2 grid */}
        <Animated.View
          entering={FadeInDown.delay(340).duration(400)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('home.popularCities')}
            </Text>
          </View>
          <View style={styles.citiesGrid}>
            {CITIES.map((c) => (
              <Pressable
                key={c.key}
                style={[styles.cityTile, SHADOWS.sm]}
                onPress={() => openCitySearch(c.key)}
              >
                <Image source={{ uri: c.image }} style={styles.cityImage} contentFit="cover" />
                <View style={styles.cityOverlay} />
                <View style={styles.cityLabelWrap}>
                  <Text style={styles.cityLabel}>{isArabic ? c.nameAr : c.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Recent listings */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('home.recentlyViewed')}
            </Text>
            <Pressable onPress={() => navigation.navigate('Search')} hitSlop={8}>
              <Text style={styles.viewMore}>{t('home.viewMore')}</Text>
            </Pressable>
          </View>

          {recent.isLoading ? (
            <FeedSkeleton />
          ) : (recent.data?.data.length ?? 0) === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('search.noResults')}
              </Text>
            </View>
          ) : (
            <View>
              {recent.data!.data.map((listing: Listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  variant="feed"
                  onPress={() => openListing(listing.id)}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function CarouselSkeleton() {
  return (
    <View style={styles.carouselSkeletonRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.carouselSkeleton}>
          <View style={styles.skeletonSpinner}>
            <BrandSpinner size={24} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.feedSkeleton}>
          <View style={styles.skeletonSpinner}>
            <BrandSpinner size={24} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollRoot: { flex: 1 },
  scrollContent: { paddingBottom: SIZES.huge },

  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxxl + SIZES.md,
    borderBottomLeftRadius: SIZES.borderRadiusXl,
    borderBottomRightRadius: SIZES.borderRadiusXl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  brand: {
    fontFamily: FONTS.extraBold,
    fontSize: SIZES.h3,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  greeting: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    color: COLORS.white,
    marginTop: SIZES.lg,
    lineHeight: 32,
  },
  searchWrap: {
    marginTop: SIZES.lg,
  },

  chipRow: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    gap: SIZES.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },

  section: {
    marginTop: SIZES.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
  },
  viewMore: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },

  carouselList: {
    paddingHorizontal: SIZES.lg,
  },

  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
  },
  cityTile: {
    width: '47%',
    height: 110,
    borderRadius: SIZES.borderRadiusLg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted,
  },
  cityImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,16,48,0.35)',
  },
  cityLabelWrap: {
    position: 'absolute',
    bottom: SIZES.md,
    start: SIZES.md,
  },
  cityLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    color: COLORS.white,
  },

  // Inline list area
  emptyInline: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },

  // Skeletons
  carouselSkeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
  },
  carouselSkeleton: {
    width: 240,
    height: 220,
    borderRadius: SIZES.borderRadiusLg,
    backgroundColor: '#EFEFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedSkeleton: {
    height: 240,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    backgroundColor: '#EFEFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonSpinner: {
    opacity: 0.7,
  },
});
