import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRTL } from '../hooks/useRTL';
import { useTheme } from '../hooks/useTheme';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import PriceText from './PriceText';
import SmartImage from './SmartImage';
import { listingCoverUrl } from '../utils/listingImages';
import { formatNumber } from '../utils/formatters';

const { width: W } = Dimensions.get('window');

interface Listing {
  id: string;
  titleAr?: string;
  titleEn?: string;
  title?: string;
  price: number;
  city?: string;
  district?: string;
  coverImageUrl?: string;
  transactionType?: 'sale' | 'rent';
  type?: 'sale' | 'rent';
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

interface Props {
  item: Listing;
  variant?: 'grid' | 'list';
  onPress?: () => void;
}

export function getListingTitle(item: Listing, isAr: boolean): string {
  if (isAr) return item.titleAr || item.title || item.titleEn || '';
  return item.titleEn || item.title || item.titleAr || '';
}

export default function ListingCard({ item, variant = 'grid', onPress }: Props) {
  const { isAr } = useRTL();
  const { colors } = useTheme();
  const tx = item.transactionType || item.type;
  const isRent = tx === 'rent';
  const badgeColor = isRent ? colors.success : colors.primary;
  const badgeText = isRent ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Sale');

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.surface }]}
        onPress={onPress}
      >
        <View style={styles.listImageBox}>
          <SmartImage uri={listingCoverUrl(item)} style={styles.listImage} fallbackIconSize={24} />
          <View style={[styles.badge, { backgroundColor: badgeColor, top: 8, left: 8 }]}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        </View>
        <View style={styles.listInfo}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]} numberOfLines={1}>
            {getListingTitle(item, isAr)}
          </Text>
          <PriceText
            value={item.price}
            style={[TYPOGRAPHY.subtitle, { color: colors.primary, fontWeight: '900', marginTop: 4 }]}
            currencyStyle={TYPOGRAPHY.small}
          />
          {(item.city || item.district) && (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>
                {[item.district, item.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          <View style={styles.statsRow}>
            {item.bedrooms != null && (
              <View style={styles.stat}>
                <Ionicons name="bed-outline" size={11} color={colors.textSecondary} />
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>{formatNumber(item.bedrooms)}</Text>
              </View>
            )}
            {item.bathrooms != null && (
              <View style={styles.stat}>
                <Ionicons name="water-outline" size={11} color={colors.textSecondary} />
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>{formatNumber(item.bathrooms)}</Text>
              </View>
            )}
            {item.area != null && (
              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>{formatNumber(item.area)}م²</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const gridWidth = (W - SIZES.lg * 2 - SIZES.sm) / 2;
  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: gridWidth, backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.gridImageBox}>
        <SmartImage uri={listingCoverUrl(item)} style={styles.gridImage} fallbackIconSize={28} />
        <View style={[styles.badge, { backgroundColor: badgeColor, top: 8, right: 8 }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>
      <View style={styles.gridInfo}>
        <PriceText
          value={item.price}
          style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}
          currencyStyle={TYPOGRAPHY.small}
        />
        <Text style={[TYPOGRAPHY.small, { color: colors.text, marginTop: 2 }]} numberOfLines={1}>
          {getListingTitle(item, isAr)}
        </Text>
        {(item.city || item.district) && (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
              {[item.district, item.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        {(item.bedrooms != null || item.bathrooms != null || item.area != null) && (
          <View style={styles.statsRow}>
            {item.bedrooms != null && (
              <View style={styles.stat}>
                <Ionicons name="bed-outline" size={11} color={colors.textSecondary} />
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{formatNumber(item.bedrooms)}</Text>
              </View>
            )}
            {item.bathrooms != null && (
              <View style={styles.stat}>
                <Ionicons name="water-outline" size={11} color={colors.textSecondary} />
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{formatNumber(item.bathrooms)}</Text>
              </View>
            )}
            {item.area != null && (
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{formatNumber(item.area)}م²</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridCard: { borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  gridImageBox: { position: 'relative' },
  gridImage: { width: '100%', height: 120 },
  gridInfo: { padding: SIZES.sm },
  listCard: { flexDirection: 'row', borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  listImageBox: { width: 110, height: 110, position: 'relative' },
  listImage: { width: '100%', height: '100%' },
  listInfo: { flex: 1, padding: SIZES.sm, justifyContent: 'center' },
  badge: { position: 'absolute', paddingHorizontal: 7, paddingVertical: 2, borderRadius: SIZES.borderRadiusFull },
  badgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  statsRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
