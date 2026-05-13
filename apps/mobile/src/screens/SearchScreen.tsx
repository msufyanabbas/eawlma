import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

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

export default function SearchScreen({ navigation, route }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [query, setQuery] = useState(route?.params?.query || '');
  const [txType, setTxType] = useState('');
  const [propType, setPropType] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['search', query, txType, propType, city],
    queryFn: () => listingsApi.search({
      search: query || undefined,
      transactionType: txType || undefined,
      propertyType: propType || undefined,
      city: city || undefined,
      limit: 30,
    }),
  });

  const results = data?.data?.data || data?.data?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={isAr ? 'ابحث...' : 'Search...'}
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => refetch()}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? '#FFF' : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersBox}>
            <Text style={styles.filterLabel}>
              {isAr ? 'النوع' : 'Type'}
            </Text>
            <View style={styles.chipsRow}>
              {TRANSACTION_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, txType === t.value && styles.chipActive]}
                  onPress={() => setTxType(t.value)}
                >
                  <Text style={[styles.chipText, txType === t.value && styles.chipTextActive]}>
                    {isAr ? t.labelAr : t.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterLabel}>
              {isAr ? 'نوع العقار' : 'Property'}
            </Text>
            <View style={styles.chipsRow}>
              {PROPERTY_TYPES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, propType === p.value && styles.chipActive]}
                  onPress={() => setPropType(p.value)}
                >
                  <Text style={[styles.chipText, propType === p.value && styles.chipTextActive]}>
                    {isAr ? p.labelAr : p.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterLabel}>
              {isAr ? 'المدينة' : 'City'}
            </Text>
            <TextInput
              style={styles.cityInput}
              placeholder={isAr ? 'الرياض، جدة...' : 'Riyadh, Jeddah...'}
              placeholderTextColor={COLORS.textSecondary}
              value={city}
              onChangeText={setCity}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={() => { refetch(); setShowFilters(false); }}>
              <Text style={styles.applyBtnText}>
                {isAr ? 'تطبيق الفلاتر' : 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.resultsBar}>
          <Text style={styles.resultsCount}>
            <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{results.length}</Text>
            {' '}{isAr ? 'نتيجة' : 'results'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            >
              <View style={styles.resultImageBox}>
                {item.coverImageUrl ? (
                  <Image
                    source={{ uri: item.coverImageUrl }}
                    style={styles.resultImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.resultImage, styles.resultImageEmpty]}>
                    <Ionicons name="home" size={24} color={COLORS.primaryLight} />
                  </View>
                )}
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {isAr ? item.titleAr : item.titleEn}
                </Text>
                <Text style={styles.resultPrice}>
                  {Number(item.price).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                </Text>
                <View style={styles.resultLocation}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.resultLocationText}>
                    {item.district}, {item.city}
                  </Text>
                </View>
                <View style={styles.resultStats}>
                  {item.bedrooms && <Text style={styles.resultStat}>🛏 {item.bedrooms}</Text>}
                  {item.bathrooms && <Text style={styles.resultStat}>🚿 {item.bathrooms}</Text>}
                  {item.area && <Text style={styles.resultStat}>📐 {item.area}م²</Text>}
                </View>
              </View>
              <View style={[
                styles.resultBadge,
                { backgroundColor: item.transactionType === 'rent' ? COLORS.success : COLORS.primary }
              ]}>
                <Text style={styles.resultBadgeText}>
                  {item.transactionType === 'rent'
                    ? (isAr ? 'إيجار' : 'Rent')
                    : (isAr ? 'بيع' : 'Sale')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {isAr ? 'لا توجد نتائج' : 'No results found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, gap: SIZES.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: SIZES.borderRadiusFull, paddingHorizontal: SIZES.md, height: 44, gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text },
  filterBtn: { width: 44, height: 44, borderRadius: SIZES.borderRadius, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filtersBox: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.md },
  filterLabel: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SIZES.sm, marginTop: SIZES.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.small, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  cityInput: { backgroundColor: COLORS.background, borderRadius: SIZES.borderRadius, padding: SIZES.md, fontSize: SIZES.body, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontWeight: '700', fontSize: SIZES.body },
  resultsBar: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  resultsCount: { fontSize: SIZES.body, color: COLORS.textSecondary },
  list: { padding: SIZES.md, gap: SIZES.sm, paddingBottom: SIZES.xxxl },
  resultCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  resultImageBox: { width: 110, height: 110 },
  resultImage: { width: '100%', height: '100%' },
  resultImageEmpty: { backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, padding: SIZES.sm, justifyContent: 'center' },
  resultTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
  resultPrice: { fontSize: SIZES.subtitle, fontWeight: '900', color: COLORS.primary, marginTop: 4, textAlign: 'right' },
  resultLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3, justifyContent: 'flex-end' },
  resultLocationText: { fontSize: SIZES.small, color: COLORS.textSecondary },
  resultStats: { flexDirection: 'row', gap: SIZES.sm, marginTop: 6, justifyContent: 'flex-end' },
  resultStat: { fontSize: 11, color: COLORS.textSecondary },
  resultBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  resultBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.md },
});
