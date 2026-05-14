import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const TRANSACTION_TYPES = [
  { labelAr: 'الكل', labelEn: 'All', value: '' },
  { labelAr: 'للبيع', labelEn: 'Sale', value: 'sale' },
  { labelAr: 'للإيجار', labelEn: 'Rent', value: 'rent' },
];

const PROPERTY_TYPES = [
  { labelAr: 'الكل', labelEn: 'All', value: '' },
  { labelAr: 'شقة', labelEn: 'Apt', value: 'apartment' },
  { labelAr: 'فيلا', labelEn: 'Villa', value: 'villa' },
  { labelAr: 'أرض', labelEn: 'Land', value: 'land' },
  { labelAr: 'شاليه', labelEn: 'Chalet', value: 'chalet' },
  { labelAr: 'مزرعة', labelEn: 'Farm', value: 'farm' },
];

const SORT_OPTIONS = [
  { labelAr: 'الأحدث', labelEn: 'Newest', value: 'newest' },
  { labelAr: 'السعر ↑', labelEn: 'Price ↑', value: 'price_asc' },
  { labelAr: 'السعر ↓', labelEn: 'Price ↓', value: 'price_desc' },
];

export default function SearchScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { isAr, textAlign } = useRTL();
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
              placeholder={isAr ? 'ابحث...' : 'Search...'}
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
            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'النوع' : 'Type'}</FilterLabel>
            <Chips items={TRANSACTION_TYPES} value={txType} onChange={setTxType} isAr={isAr} colors={colors} />

            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'نوع العقار' : 'Property'}</FilterLabel>
            <Chips items={PROPERTY_TYPES} value={propType} onChange={setPropType} isAr={isAr} colors={colors} />

            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'المدينة' : 'City'}</FilterLabel>
            <TextInput
              style={[styles.cityInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
              placeholder={isAr ? 'الرياض، جدة...' : 'Riyadh, Jeddah...'}
              placeholderTextColor={colors.textSecondary}
              value={city}
              onChangeText={setCity}
            />

            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'نطاق السعر' : 'Price Range'}</FilterLabel>
            <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
              <TextInput
                style={[styles.cityInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
                placeholder={isAr ? 'الحد الأدنى' : 'Min'}
                placeholderTextColor={colors.textSecondary}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.cityInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign }]}
                placeholder={isAr ? 'الحد الأقصى' : 'Max'}
                placeholderTextColor={colors.textSecondary}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
            </View>

            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'غرف النوم' : 'Bedrooms'}</FilterLabel>
            <Chips
              items={[
                { labelAr: 'الكل', labelEn: 'Any', value: '' },
                { labelAr: '1+', labelEn: '1+', value: '1' },
                { labelAr: '2+', labelEn: '2+', value: '2' },
                { labelAr: '3+', labelEn: '3+', value: '3' },
                { labelAr: '4+', labelEn: '4+', value: '4' },
              ]}
              value={bedrooms}
              onChange={setBedrooms}
              isAr={isAr}
              colors={colors}
            />

            <FilterLabel colors={colors} textAlign={textAlign}>{isAr ? 'الترتيب' : 'Sort'}</FilterLabel>
            <Chips items={SORT_OPTIONS} value={sort} onChange={setSort} isAr={isAr} colors={colors} />

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => { refetch(); setShowFilters(false); }}
            >
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                {isAr ? 'تطبيق الفلاتر' : 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.resultsBar, { borderTopColor: colors.divider }]}>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{results.length}</Text>
            {' '}{isAr ? 'نتيجة' : 'results'}
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
              title={isAr ? 'لا توجد نتائج' : 'No results found'}
              subtitle={isAr ? 'جرّب فلاتر مختلفة' : 'Try different filters'}
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

function Chips({ items, value, onChange, isAr, colors }: any) {
  return (
    <View style={styles.chipsRow}>
      {items.map((t: any) => {
        const active = value === t.value;
        return (
          <TouchableOpacity
            key={String(t.value)}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => onChange(t.value)}
          >
            <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
              {isAr ? t.labelAr : t.labelEn}
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
