// SearchScreen — sticky search + filters + sort header sitting above an
// infinite-scrolling feed of ListingCards. Filters live in a BottomSheet so
// the list stays in view when users open them. Sorting is client-side over
// the currently-loaded pages (the backend has no `sort=` param yet) which is
// good enough for the typical 30–60 listings a user actually scrolls through.
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { Button, Menu, TextInput } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { ListingCard } from '@/components/ListingCard';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { BrandSpinner } from '@/components/LoadingScreen';
import { listingsApi } from '@/api';
import type { Listing, ListingSearchParams } from '@/api/listings.api';
import type { RootStackParamList, TabsParamList } from '@/navigation/types';

type SearchNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList, 'Search'>,
  StackNavigationProp<RootStackParamList>
>;

type SortKey = 'newest' | 'priceAsc' | 'priceDesc';

interface Filters {
  type?: 'sale' | 'rent';
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
}

const PROPERTY_TYPES: Array<{ key: string; labelKey: string }> = [
  { key: 'apartment', labelKey: 'propertyTypes.apartment' },
  { key: 'villa', labelKey: 'propertyTypes.villa' },
  { key: 'office', labelKey: 'propertyTypes.office' },
  { key: 'land', labelKey: 'propertyTypes.land' },
];

const BEDROOMS: number[] = [0, 1, 2, 3, 4];
const PAGE_LIMIT = 10;

export function SearchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SearchNav>();
  const route = useRoute<RouteProp<TabsParamList, 'Search'>>();
  const initialQuery = route.params?.initialQuery ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [committed, setCommitted] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');

  // Draft state mirrors filters while the sheet is open — apply only commits.
  const [draft, setDraft] = useState<Filters>({});

  const baseParams = useMemo<Omit<ListingSearchParams, 'page' | 'limit'>>(
    () => ({
      ...(committed ? { q: committed } : {}),
      ...filters,
    }),
    [committed, filters],
  );

  const queryResult = useInfiniteQuery({
    queryKey: ['listings', 'search', baseParams],
    queryFn: ({ pageParam }) =>
      listingsApi.search({ ...baseParams, page: pageParam as number, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return loaded < lastPage.meta.total ? lastPage.meta.page + 1 : undefined;
    },
  });

  const allListings: Listing[] = useMemo(
    () => queryResult.data?.pages.flatMap((p) => p.data) ?? [],
    [queryResult.data],
  );

  const sortedListings = useMemo(() => {
    if (sort === 'newest') return allListings;
    const copy = [...allListings];
    copy.sort((a, b) => (sort === 'priceAsc' ? a.price - b.price : b.price - a.price));
    return copy;
  }, [allListings, sort]);

  const total = queryResult.data?.pages[0]?.meta.total ?? 0;
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && v !== '',
  ).length;

  const handleSubmitSearch = () => setCommitted(query.trim());

  const openFilters = () => {
    setDraft(filters);
    setSheetOpen(true);
  };
  const applyFilters = () => {
    setFilters(draft);
    setSheetOpen(false);
  };
  const clearFilters = () => {
    setFilters({});
    setDraft({});
    setQuery('');
    setCommitted('');
    setSheetOpen(false);
  };

  const handleEndReached = useCallback(() => {
    if (queryResult.hasNextPage && !queryResult.isFetchingNextPage) {
      queryResult.fetchNextPage();
    }
  }, [queryResult]);

  const openListing = (id: string) => navigation.navigate('ListingDetail', { id });

  const renderItem = ({ item }: { item: Listing }) => (
    <ListingCard listing={item} variant="feed" onPress={() => openListing(item.id)} />
  );

  // ----- Header (sticky) ----------------------------------------------------
  const Header = (
    <View
      style={[
        styles.headerWrap,
        { paddingTop: insets.top + SIZES.sm, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.searchRow}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <RNTextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitSearch}
            placeholder={t('nav.searchPlaceholder', { defaultValue: t('home.searchPlaceholder') })}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={openFilters}
          style={[styles.filterButton, { backgroundColor: COLORS.primary }]}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
        >
          <Ionicons name="options" size={20} color={COLORS.white} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {queryResult.isLoading
            ? t('common.loading')
            : `${total.toLocaleString()} ${t('home.featuredListings').toLowerCase()}`}
        </Text>

        <Menu
          visible={sortMenuOpen}
          onDismiss={() => setSortMenuOpen(false)}
          anchor={
            <Pressable
              onPress={() => setSortMenuOpen(true)}
              style={[styles.sortButton, { borderColor: colors.border }]}
            >
              <Ionicons name="swap-vertical" size={14} color={colors.text} />
              <Text style={[styles.sortLabel, { color: colors.text }]}>
                {sort === 'newest'
                  ? t('search.newest')
                  : sort === 'priceAsc'
                    ? t('search.priceAsc')
                    : t('search.priceDesc')}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.text} />
            </Pressable>
          }
        >
          <Menu.Item
            onPress={() => {
              setSort('newest');
              setSortMenuOpen(false);
            }}
            title={t('search.newest')}
          />
          <Menu.Item
            onPress={() => {
              setSort('priceAsc');
              setSortMenuOpen(false);
            }}
            title={t('search.priceAsc')}
          />
          <Menu.Item
            onPress={() => {
              setSort('priceDesc');
              setSortMenuOpen(false);
            }}
            title={t('search.priceDesc')}
          />
        </Menu>
      </View>
    </View>
  );

  // ----- Body --------------------------------------------------------------
  let body: React.ReactNode;
  if (queryResult.isLoading) {
    body = (
      <View style={styles.fullCenter}>
        <BrandSpinner size={40} />
        <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  } else if (sortedListings.length === 0) {
    body = (
      <EmptyState
        icon="search-outline"
        title={t('search.noResults')}
        body={t('search.applyFilters')}
        ctaLabel={t('search.clearFilters')}
        onCta={clearFilters}
      />
    );
  } else {
    body = (
      <FlatList
        data={sortedListings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          queryResult.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <BrandSpinner size={24} />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {Header}
      <Animated.View entering={FadeIn.duration(200)} style={styles.flex}>
        {body}
      </Animated.View>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} heightFraction={0.78}>
        <FilterSheetContent
          draft={draft}
          setDraft={setDraft}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      </BottomSheet>
    </View>
  );
}

// -------------------------------------------------------------------------
// Filter sheet content — extracted so its own state lives outside the
// re-render cycle of the screen body.
// -------------------------------------------------------------------------
function FilterSheetContent({
  draft,
  setDraft,
  onApply,
  onClear,
}: {
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();

  const setType = (type?: 'sale' | 'rent') => setDraft((d) => ({ ...d, type }));
  const setPropertyType = (pt?: string) =>
    setDraft((d) => ({ ...d, propertyType: d.propertyType === pt ? undefined : pt }));
  const setBedrooms = (n: number) =>
    setDraft((d) => ({ ...d, minBedrooms: d.minBedrooms === n ? undefined : n }));

  return (
    <View>
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('search.filters')}</Text>

      {/* Sale/Rent segmented */}
      <View style={styles.segmented}>
        {[
          { key: undefined, label: t('home.tabBuy') + ' / ' + t('home.tabRent') },
          { key: 'sale' as const, label: t('home.tabBuy') },
          { key: 'rent' as const, label: t('home.tabRent') },
        ].map((opt) => {
          const active = draft.type === opt.key;
          return (
            <Pressable
              key={String(opt.key ?? 'all')}
              onPress={() => setType(opt.key)}
              style={[
                styles.segment,
                {
                  backgroundColor: active ? COLORS.primary : colors.surfaceMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? COLORS.white : colors.text },
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* City */}
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('search.city')}
      </Text>
      <TextInput
        mode="outlined"
        value={draft.city ?? ''}
        onChangeText={(v) => setDraft((d) => ({ ...d, city: v || undefined }))}
        outlineColor={colors.border}
        activeOutlineColor={COLORS.primary}
        style={styles.textInput}
        dense
      />

      {/* Property type chips */}
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('search.propertyType')}
      </Text>
      <View style={styles.chipsRow}>
        {PROPERTY_TYPES.map((pt) => {
          const active = draft.propertyType === pt.key;
          return (
            <Pressable
              key={pt.key}
              onPress={() => setPropertyType(pt.key)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: active ? COLORS.primary : colors.surface,
                  borderColor: active ? COLORS.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeChipText,
                  { color: active ? COLORS.white : colors.text },
                ]}
              >
                {t(pt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Price min/max */}
      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('search.minPrice')}
          </Text>
          <TextInput
            mode="outlined"
            value={draft.minPrice?.toString() ?? ''}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, minPrice: v ? Number(v.replace(/[^0-9]/g, '')) : undefined }))
            }
            keyboardType="number-pad"
            outlineColor={colors.border}
            activeOutlineColor={COLORS.primary}
            style={styles.textInput}
            dense
          />
        </View>
        <View style={styles.priceCol}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('search.maxPrice')}
          </Text>
          <TextInput
            mode="outlined"
            value={draft.maxPrice?.toString() ?? ''}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, maxPrice: v ? Number(v.replace(/[^0-9]/g, '')) : undefined }))
            }
            keyboardType="number-pad"
            outlineColor={colors.border}
            activeOutlineColor={COLORS.primary}
            style={styles.textInput}
            dense
          />
        </View>
      </View>

      {/* Bedrooms stepper */}
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('search.minBedrooms')}
      </Text>
      <View style={styles.chipsRow}>
        {BEDROOMS.map((n) => {
          const active = draft.minBedrooms === n;
          return (
            <Pressable
              key={n}
              onPress={() => setBedrooms(n)}
              style={[
                styles.bedChip,
                {
                  backgroundColor: active ? COLORS.primary : colors.surface,
                  borderColor: active ? COLORS.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.bedChipText,
                  { color: active ? COLORS.white : colors.text },
                ]}
              >
                {n === 4 ? '4+' : n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.sheetActions}>
        <Button
          mode="text"
          onPress={onClear}
          textColor={colors.textSecondary}
          style={styles.clearBtn}
        >
          {t('search.clearFilters')}
        </Button>
        <Button
          mode="contained"
          onPress={onApply}
          buttonColor={COLORS.primary}
          textColor={COLORS.white}
          style={styles.applyBtn}
          contentStyle={{ paddingVertical: 4 }}
          labelStyle={{ fontFamily: FONTS.bold }}
        >
          {t('search.applyFilters')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  headerWrap: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomLeftRadius: SIZES.borderRadiusLg,
    borderBottomRightRadius: SIZES.borderRadiusLg,
    ...SHADOWS.sm,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    borderRadius: SIZES.borderRadiusFull,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: SIZES.borderRadiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.caption,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.md,
  },
  countText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  sortLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },

  listContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.huge,
  },

  footerLoader: {
    paddingVertical: SIZES.lg,
    alignItems: 'center',
  },

  fullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.md,
  },
  loadingLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },

  // ---- Sheet ----
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    marginBottom: SIZES.lg,
  },
  segmented: {
    flexDirection: 'row',
    gap: SIZES.xs,
    marginBottom: SIZES.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: SIZES.sm + 2,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    alignItems: 'center',
  },
  segmentLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: SIZES.body,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  typeChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  typeChipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },
  priceRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  priceCol: { flex: 1 },
  bedChip: {
    minWidth: 48,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
  },
  bedChipText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    marginTop: SIZES.xl,
  },
  clearBtn: {
    flex: 0,
  },
  applyBtn: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
  },
});
