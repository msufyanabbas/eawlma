// DashboardScreen — agent dashboard. Top-level metrics, quick actions, recent
// inquiries, and a preview of the agent's own listings. The KPI strip and the
// trend chips are intentionally fed by `/metrics/agent` so the same shape is
// usable on web; here we ship a scaffold that renders sensibly when fields are
// missing and shows placeholder "+12%" trend chips for now.
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
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
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, listingsApi } from '@/api';
import type { Listing } from '@/api/listings.api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'Dashboard'>;

interface AgentMetrics {
  activeListings: number;
  totalViews: number;
  totalInquiries: number;
  conversionRate: number;
  unreadMessages: number;
  currentPlan: string;
}

interface RecentInquiry {
  id: string;
  leadName: string;
  listingTitle: string;
  status: 'new' | 'contacted' | string;
  createdAt: string;
}

async function fetchMetrics(): Promise<AgentMetrics> {
  const { data } = await apiClient.get<AgentMetrics>('/metrics/agent');
  return data;
}

async function fetchRecentInquiries(): Promise<RecentInquiry[]> {
  const { data } = await apiClient.get<{ data: RecentInquiry[] }>('/inquiries/mine', {
    params: { limit: 5 },
  });
  return data.data ?? [];
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  } catch {
    return '';
  }
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const metrics = useQuery({ queryKey: ['metrics', 'agent'], queryFn: fetchMetrics });
  const inquiries = useQuery({ queryKey: ['inquiries', 'mine'], queryFn: fetchRecentInquiries });
  const myListings = useQuery({ queryKey: ['listings', 'mine'], queryFn: () => listingsApi.mine() });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['metrics', 'agent'] }),
      queryClient.invalidateQueries({ queryKey: ['inquiries', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const kpis: Array<{
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    labelKey: string;
    value: string;
    trend: string;
    trendUp?: boolean;
  }> = [
    {
      key: 'active',
      icon: 'home-outline',
      labelKey: 'dashboard.activeListings',
      value: String(metrics.data?.activeListings ?? 0),
      trend: '+12%',
      trendUp: true,
    },
    {
      key: 'views',
      icon: 'eye-outline',
      labelKey: 'dashboard.totalViews',
      value: String(metrics.data?.totalViews ?? 0),
      trend: '+18%',
      trendUp: true,
    },
    {
      key: 'inquiries',
      icon: 'chatbubble-ellipses-outline',
      labelKey: 'dashboard.totalInquiries',
      value: String(metrics.data?.totalInquiries ?? 0),
      trend: '+5%',
      trendUp: true,
    },
    {
      key: 'conversion',
      icon: 'trending-up-outline',
      labelKey: 'dashboard.conversion',
      value: `${Math.round((metrics.data?.conversionRate ?? 0) * 100)}%`,
      trend: '+2%',
      trendUp: true,
    },
    {
      key: 'unread',
      icon: 'mail-unread-outline',
      labelKey: 'dashboard.unreadMessages',
      value: String(metrics.data?.unreadMessages ?? 0),
      trend: '+3',
      trendUp: true,
    },
    {
      key: 'plan',
      icon: 'star-outline',
      labelKey: 'dashboard.currentPlan',
      value: metrics.data?.currentPlan ?? '—',
      trend: '',
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={t('dashboard.overview')}
        right={
          <Pressable
            onPress={() => navigation.navigate('AddListing')}
            style={styles.addBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.newListing')}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* KPI grid */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.kpiGrid}>
          {kpis.map((k, idx) => (
            <View
              key={k.key}
              style={[styles.kpiCard, { backgroundColor: colors.surface }, SHADOWS.sm]}
            >
              <View style={styles.kpiTop}>
                <View style={styles.kpiIconBubble}>
                  <Ionicons name={k.icon} size={16} color={COLORS.primary} />
                </View>
                {k.trend ? (
                  <View
                    style={[
                      styles.trendChip,
                      { backgroundColor: k.trendUp ? '#E8F8EE' : '#FDECEC' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trendText,
                        { color: k.trendUp ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {k.trend}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                {t(k.labelKey)}
              </Text>
              <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1}>
                {metrics.isLoading && idx < 5 ? '…' : k.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('common.actions')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            <QuickAction
              icon="add-circle-outline"
              label={t('dashboard.newListing')}
              onPress={() => navigation.navigate('AddListing')}
            />
            <QuickAction
              icon="rocket-outline"
              label={t('myListings.boostFeature')}
              onPress={() => navigation.navigate('MyListings')}
            />
            <QuickAction
              icon="bar-chart-outline"
              label={t('dashboard.analytics')}
              onPress={() => navigation.navigate('MyListings')}
            />
          </ScrollView>
        </Animated.View>

        {/* Recent inquiries */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('dashboard.inquiries')}
            </Text>
          </View>
          {inquiries.isLoading ? (
            <View style={styles.spinnerWrap}>
              <BrandSpinner size={24} />
            </View>
          ) : (inquiries.data?.length ?? 0) === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {t('inquiries.empty')}
            </Text>
          ) : (
            inquiries.data!.map((inq) => (
              <Pressable
                key={inq.id}
                style={[styles.inqRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => console.log('open inquiry', inq.id)}
              >
                <View style={styles.inqAvatar}>
                  <Text style={styles.inqAvatarText}>
                    {(inq.leadName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inqName, { color: colors.text }]} numberOfLines={1}>
                    {inq.leadName}
                  </Text>
                  <Text style={[styles.inqTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {inq.listingTitle}
                  </Text>
                </View>
                <View style={styles.inqRight}>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          inq.status === 'new' ? '#E6F0FF' : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: inq.status === 'new' ? COLORS.info : colors.textSecondary },
                      ]}
                    >
                      {inq.status}
                    </Text>
                  </View>
                  <Text style={[styles.inqTime, { color: colors.textMuted }]}>
                    {formatRelative(inq.createdAt)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Animated.View>

        {/* My listings preview */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('dashboard.myListings')}
            </Text>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('MyListings')}>
              <Text style={styles.viewMore}>{t('common.viewAll')}</Text>
            </Pressable>
          </View>
          {myListings.isLoading ? (
            <View style={styles.spinnerWrap}>
              <BrandSpinner size={24} />
            </View>
          ) : (myListings.data?.length ?? 0) === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {t('dashboard.noListings')}
            </Text>
          ) : (
            (myListings.data ?? []).slice(0, 3).map((l: Listing) => (
              <ListingCard
                key={l.id}
                listing={l}
                variant="feed"
                onPress={() => navigation.navigate('ListingDetail', { id: l.id })}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickBtn} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: SIZES.huge },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    gap: SIZES.md,
  },
  kpiCard: {
    width: '47%',
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.md,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  kpiIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusFull,
  },
  trendText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.caption,
  },
  kpiLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
  },
  kpiValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
    marginTop: 2,
  },
  section: {
    marginTop: SIZES.xl,
    paddingHorizontal: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    marginBottom: SIZES.md,
  },
  viewMore: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  quickRow: {
    gap: SIZES.md,
    paddingVertical: SIZES.xs,
  },
  quickBtn: {
    width: 140,
    height: 80,
    borderRadius: SIZES.borderRadiusLg,
    backgroundColor: COLORS.primary,
    padding: SIZES.md,
    justifyContent: 'space-between',
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
  inqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
    marginBottom: SIZES.sm,
    gap: SIZES.md,
  },
  inqAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inqAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    color: COLORS.white,
  },
  inqName: { fontFamily: FONTS.bold, fontSize: SIZES.body },
  inqTitle: { fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: 2 },
  inqRight: { alignItems: 'flex-end', gap: 4 },
  statusChip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusFull,
  },
  statusText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, textTransform: 'capitalize' },
  inqTime: { fontFamily: FONTS.regular, fontSize: SIZES.caption },
  spinnerWrap: { paddingVertical: SIZES.xl, alignItems: 'center' },
  empty: { fontFamily: FONTS.regular, fontSize: SIZES.body, textAlign: 'center', paddingVertical: SIZES.xl },
});
