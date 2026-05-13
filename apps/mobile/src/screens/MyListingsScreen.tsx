import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

const STATUSES = [
  { labelAr: 'الكل', labelEn: 'All', value: '' },
  { labelAr: 'نشط', labelEn: 'Active', value: 'active' },
  { labelAr: 'مسودة', labelEn: 'Draft', value: 'draft' },
  { labelAr: 'منتهي', labelEn: 'Expired', value: 'expired' },
];

export default function MyListingsScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsApi.getMine(),
  });

  const all = data?.data?.data || data?.data?.items || data?.data || [];
  const listings = status ? all.filter((l: any) => l.status === status) : all;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons
            name={isAr ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAr ? 'إعلاناتي' : 'My Listings'}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddListing')}>
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.statusChip, status === s.value && styles.statusChipActive]}
            onPress={() => setStatus(s.value)}
          >
            <Text style={[styles.statusText, status === s.value && styles.statusTextActive]}>
              {isAr ? s.labelAr : s.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="home-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {isAr ? 'لا توجد إعلانات' : 'No listings yet'}
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddListing')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>
              {isAr ? 'إضافة إعلان' : 'Add Listing'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            >
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Ionicons name="home" size={24} color={COLORS.primaryLight} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                  {isAr ? item.titleAr : item.titleEn}
                </Text>
                <Text style={styles.price}>
                  {Number(item.price).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                </Text>
                <Text style={styles.statusLabel}>
                  {item.status === 'active'
                    ? (isAr ? '● نشط' : '● Active')
                    : (isAr ? `● ${item.status}` : `● ${item.status}`)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('EditListing', { id: item.id })}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: SIZES.lg },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: '#FFF' },
  statusBar: { flexDirection: 'row', gap: SIZES.sm, padding: SIZES.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1, borderColor: COLORS.border },
  statusChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusText: { fontSize: SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
  statusTextActive: { color: '#FFF' },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  thumb: { width: 100, height: 100 },
  thumbEmpty: { backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: SIZES.md, justifyContent: 'center' },
  title: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  price: { fontSize: SIZES.subtitle, fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  statusLabel: { fontSize: SIZES.small, color: COLORS.success, marginTop: 4, fontWeight: '600' },
  editBtn: { width: 44, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.divider },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  emptyText: { fontSize: SIZES.subtitle, fontWeight: '700', color: COLORS.text, marginTop: SIZES.lg, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.md, marginTop: SIZES.lg },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: SIZES.bodyLg },
});
