// MyListingsScreen — agent-owned listings with status filtering, per-row action
// menu, and a floating action button to start the AddListing wizard. Status
// values map to `listing.status.*` (active / pending / rejected / expired).
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { Header } from '@/components/Header';
import { ListingCard } from '@/components/ListingCard';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, extractErrorMessage, listingsApi } from '@/api';
import type { Listing } from '@/api/listings.api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'MyListings'>;

type StatusTab = 'all' | 'active' | 'pending' | 'rejected' | 'expired';

const TABS: Array<{ key: StatusTab; labelKey: string }> = [
  { key: 'all', labelKey: 'inquiries.filterAll' },
  { key: 'active', labelKey: 'listing.status.active' },
  { key: 'pending', labelKey: 'listing.status.pending' },
  { key: 'rejected', labelKey: 'listing.status.rejected' },
  { key: 'expired', labelKey: 'listing.status.expired' },
];

export function MyListingsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StatusTab>('all');
  const [actionFor, setActionFor] = useState<Listing | null>(null);

  const listings = useQuery({
    queryKey: ['listings', 'mine'],
    queryFn: () => listingsApi.mine(),
  });

  const deleteListing = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/listings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] }),
    onError: (err) => Alert.alert(t('common.error'), extractErrorMessage(err)),
  });

  const filtered = useMemo<Listing[]>(() => {
    const list = listings.data ?? [];
    if (tab === 'all') return list;
    return list.filter((l) => (l.status ?? '').toLowerCase() === tab);
  }, [listings.data, tab]);

  const onAction = (action: 'edit' | 'boost' | 'duplicate' | 'delete') => {
    if (!actionFor) return;
    const id = actionFor.id;
    setActionFor(null);
    if (action === 'edit') {
      navigation.navigate('AddListing', { mode: 'edit', listingId: id });
    } else if (action === 'delete') {
      Alert.alert(
        t('myListings.deleteConfirmTitle', { count: 1 }),
        t('myListings.deleteConfirmDescription'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => deleteListing.mutate(id),
          },
        ],
      );
    } else {
      // Boost / duplicate — wire up later
      Alert.alert(t('common.more'), action);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={t('dashboard.myListings')} />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((it) => {
          const active = tab === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => setTab(it.key)}
              style={[
                styles.tabChip,
                {
                  backgroundColor: active ? COLORS.primary : colors.surface,
                  borderColor: active ? COLORS.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? COLORS.white : colors.text },
                ]}
              >
                {t(it.labelKey, { defaultValue: it.key })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {listings.isLoading ? (
        <View style={styles.center}>
          <BrandSpinner size={32} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title={t('dashboard.noListings')}
          body={t('dashboard.createFirst')}
          ctaLabel={t('dashboard.newListing')}
          onCta={() => navigation.navigate('AddListing')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
              <View style={styles.cardWrap}>
                <ListingCard
                  listing={item}
                  variant="feed"
                  onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                />
                <Pressable
                  style={[styles.menuBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
                  onPress={() => setActionFor(item)}
                  hitSlop={10}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                </Pressable>
              </View>
            </Animated.View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate('AddListing')}
        style={[styles.fab, SHADOWS.lg]}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.newListing')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </Pressable>

      {/* Action sheet */}
      <BottomSheet
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        heightFraction={0.45}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
          {actionFor?.title}
        </Text>
        <ActionRow icon="create-outline" label={t('common.edit')} onPress={() => onAction('edit')} />
        <ActionRow
          icon="rocket-outline"
          label={t('myListings.boostFeature')}
          onPress={() => onAction('boost')}
        />
        <ActionRow
          icon="copy-outline"
          label={t('myListings.duplicate')}
          onPress={() => onAction('duplicate')}
        />
        <ActionRow
          icon="trash-outline"
          label={t('common.delete')}
          danger
          onPress={() => onAction('delete')}
        />
      </BottomSheet>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? COLORS.error : colors.text}
      />
      <Text
        style={[
          styles.actionLabel,
          { color: danger ? COLORS.error : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabsRow: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  tabChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  tabText: { fontFamily: FONTS.medium, fontSize: SIZES.small, textTransform: 'capitalize' },
  list: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.huge,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { position: 'relative' },
  menuBtn: {
    position: 'absolute',
    top: SIZES.sm,
    end: SIZES.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SIZES.xl,
    end: SIZES.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    marginBottom: SIZES.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingVertical: SIZES.md,
  },
  actionLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.bodyLg,
  },
});
