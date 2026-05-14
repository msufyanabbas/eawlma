import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const TRANSACTION_TYPES = [
  { key: 'all',  value: '' },
  { key: 'sale', value: 'sale' },
  { key: 'rent', value: 'rent' },
];

const PROPERTY_TYPES = [
  { key: 'all',       value: '' },
  { key: 'apartment', value: 'apartment' },
  { key: 'villa',     value: 'villa' },
  { key: 'land',      value: 'land' },
  { key: 'chalet',    value: 'chalet' },
  { key: 'farm',      value: 'farm' },
];

const SORT_OPTIONS = [
  { key: 'sortNewest',   value: 'newest' },
  { key: 'sortPriceAsc', value: 'price_asc' },
  { key: 'sortPriceDesc',value: 'price_desc' },
];

const BEDROOM_OPTIONS = [
  { key: 'any', value: '' },
  { key: '1+', value: '1' },
  { key: '2+', value: '2' },
  { key: '3+', value: '3' },
  { key: '4+', value: '4' },
];

export default function SearchScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { textAlign } = useRTL();
  const { t } = useTranslation();
  const [query, setQuery] = useState(route?.params?.query || '');
  const [txType, setTxType] = useState('');
  const [propType, setPropType] = useState('');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['search', query, txType, propType, city, minPrice, maxPrice, bedrooms, sort],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 30 };
      if (query) params.q = query;
      if (txType) params.type = txType;
      if (propType) params.propertyTypes = propType;
      if (city) params.city = city;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);
      if (bedrooms && bedrooms !== 'any') params.minBedrooms = Number(bedrooms);
      if (sort === 'price_asc') { params.sortField = 'price'; params.sortOrder = 'ASC'; }
      if (sort === 'price_desc') { params.sortField = 'price'; params.sortOrder = 'DESC'; }
      const res = await listingsApi.search(params);
      if (__DEV__) console.log('Search API response:', JSON.stringify(res).slice(0, 500));
      return res;
    },
    staleTime: 0,
  });

  const results: any[] =
    data?.data?.data ||
    data?.data?.items ||
    data?.data ||
    data?.items ||
    [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, textAlign }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => refetch()}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { backgroundColor: colors.primary + '15', borderColor: colors.primary },
              showFilters && { backgroundColor: colors.primary },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? '#FFF' : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersBox}>
            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.type')}</FilterLabel>
            <Chips items={TRANSACTION_TYPES} ns="search" value={txType} onChange={setTxType} t={t} colors={colors} />

            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.propertyType')}</FilterLabel>
            <Chips items={PROPERTY_TYPES} ns="search" value={propType} onChange={setPropType} t={t} colors={colors} />

            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.city')}</FilterLabel>
            <TextInput
              style={[styles.cityInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
              placeholder={t('search.cityPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={city}
              onChangeText={setCity}
            />

            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.priceRange')}</FilterLabel>
            <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
              <TextInput
                style={[styles.cityInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
                placeholder={t('search.minPrice')}
                placeholderTextColor={colors.textSecondary}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.cityInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
                placeholder={t('search.maxPrice')}
                placeholderTextColor={colors.textSecondary}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
            </View>

            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.bedrooms')}</FilterLabel>
            <Chips items={BEDROOM_OPTIONS} ns="search" value={bedrooms} onChange={setBedrooms} t={t} colors={colors} />

            <FilterLabel colors={colors} textAlign={textAlign}>{t('search.sort')}</FilterLabel>
            <Chips items={SORT_OPTIONS} ns="search" value={sort} onChange={setSort} t={t} colors={colors} />

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => { refetch(); setShowFilters(false); }}
            >
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                {t('search.applyFilters')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.resultsBar, { borderTopColor: colors.divider }]}>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{results.length}</Text>
            {' '}{t('search.results')}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <ListingCard
              item={item}
              variant="list"
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('search.noResults')}
              subtitle={t('search.noResultsHint')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterLabel({ children, colors, textAlign }: any) {
  return (
    <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, fontWeight: '700', marginBottom: SIZES.sm, marginTop: SIZES.sm, textAlign }]}>
      {children}
    </Text>
  );
}

function Chips({ items, value, onChange, ns, t, colors }: any) {
  return (
    <View style={styles.chipsRow}>
      {items.map((item: any) => {
        const active = value === item.value;
        // Most keys live under `<ns>.<key>`; the bedroom shortcuts ("1+",
        // "2+", ...) are literal labels and don't have a translation entry.
        const literal = ['1+', '2+', '3+', '4+'].includes(item.key);
        const label = literal ? item.key : t(`${ns}.${item.key}`);
        return (
          <TouchableOpacity
            key={String(item.value) || item.key}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => onChange(item.value)}
          >
            <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, gap: SIZES.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.borderRadiusFull, paddingHorizontal: SIZES.md, height: 44, gap: SIZES.sm, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: SIZES.body },
  filterBtn: { width: 44, height: 44, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  filtersBox: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  cityInput: { borderRadius: SIZES.borderRadius, padding: SIZES.md, fontSize: SIZES.body, borderWidth: 1, marginBottom: SIZES.sm, height: 44 },
  applyBtn: { borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, alignItems: 'center', marginTop: SIZES.md },
  resultsBar: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, borderTopWidth: 1 },
  list: { padding: SIZES.md, gap: SIZES.sm, paddingBottom: SIZES.xxxl },
});
