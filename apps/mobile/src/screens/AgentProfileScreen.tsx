// AgentProfileScreen — public agent profile pushed from listing cards, agent
// avatars, or chat header taps. Hero card with stats, then two simple tabs:
// Listings (vertical list of `ListingCard`) and About (bio + contact). Action
// buttons deep-link to the dialer / WhatsApp / our in-app chat.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';

import { BrandSpinner } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { ListingCard } from '@/components/ListingCard';
import { apiClient, extractErrorMessage, type Listing } from '@/api';
import { FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

interface Agent {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  agencyName?: string | null;
  isVerified?: boolean;
  responseRate?: number | null;
  listingsCount?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

interface AgentListingsResponse {
  data: Listing[];
}

type Tab = 'listings' | 'about';

export function AgentProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgentProfile'>>();
  const { id } = route.params;
  const [tab, setTab] = useState<Tab>('listings');

  const agentQuery = useQuery({
    queryKey: ['agent', id],
    queryFn: async (): Promise<Agent> => {
      const { data } = await apiClient.get<Agent>(`/agents/${id}`);
      return data;
    },
  });

  const listingsQuery = useQuery({
    queryKey: ['agent', id, 'listings'],
    queryFn: async (): Promise<Listing[]> => {
      const { data } = await apiClient.get<AgentListingsResponse>(`/agents/${id}/listings`);
      return data?.data ?? [];
    },
    enabled: !!agentQuery.data,
  });

  const handleCall = () => {
    if (agentQuery.data?.phone) {
      void Linking.openURL(`tel:${agentQuery.data.phone}`);
    }
  };
  const handleWhatsapp = () => {
    const number = agentQuery.data?.whatsapp ?? agentQuery.data?.phone;
    if (!number) return;
    const sanitized = number.replace(/[^0-9]/g, '');
    void Linking.openURL(`whatsapp://send?phone=${sanitized}`);
  };
  const handleMessage = () => {
    if (!agentQuery.data) return;
    navigation.navigate('Chat', {
      threadId: `direct:${agentQuery.data.id}`,
      otherUserId: agentQuery.data.id,
    });
  };

  if (agentQuery.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <TopBar colors={colors} insets={insets} onBack={() => navigation.goBack()} />
        <View style={styles.centerWrap}>
          <BrandSpinner />
        </View>
      </View>
    );
  }

  if (agentQuery.isError || !agentQuery.data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <TopBar colors={colors} insets={insets} onBack={() => navigation.goBack()} />
        <View style={styles.centerWrap}>
          <Text style={[styles.error, { color: colors.error }]}>
            {extractErrorMessage(agentQuery.error)}
          </Text>
        </View>
      </View>
    );
  }

  const agent = agentQuery.data;
  const listings = listingsQuery.data ?? [];
  const listingsCount = agent.listingsCount ?? listings.length;

  const Header = (
    <Animated.View>
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.surface, marginTop: SIZES.md },
          SHADOWS.sm,
        ]}
      >
        {agent.avatarUrl ? (
          <Image
            source={{ uri: agent.avatarUrl }}
            style={styles.heroAvatar}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: colors.primary }]}>
            <Text style={styles.heroAvatarText}>
              {(agent.fullName ?? '?').trim()[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}

        <View style={styles.heroNameRow}>
          <Text numberOfLines={1} style={[styles.heroName, { color: colors.text }]}>
            {agent.fullName}
          </Text>
          {agent.isVerified ? (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          ) : null}
        </View>

        {agent.agencyName ? (
          <Text style={[styles.heroAgency, { color: colors.textSecondary }]}>
            {agent.agencyName}
          </Text>
        ) : null}

        <View style={styles.heroStatsRow}>
          <Stat
            value={String(listingsCount)}
            label={t('nav.myListings')}
            colors={colors}
          />
          {agent.responseRate != null ? (
            <Stat value={`${Math.round(agent.responseRate)}%`} label="Response" colors={colors} />
          ) : null}
          {agent.rating != null ? (
            <Stat value={agent.rating.toFixed(1)} label="Rating" colors={colors} />
          ) : null}
        </View>

        <View style={styles.heroActions}>
          {agent.phone ? (
            <ActionButton
              icon="call"
              label="Call"
              onPress={handleCall}
              bg={colors.primary}
              fg="#FFFFFF"
            />
          ) : null}
          {agent.whatsapp || agent.phone ? (
            <ActionButton
              icon="logo-whatsapp"
              label="WhatsApp"
              onPress={handleWhatsapp}
              bg="#25D366"
              fg="#FFFFFF"
            />
          ) : null}
          <ActionButton
            icon="chatbubble-ellipses-outline"
            label="Message"
            onPress={handleMessage}
            bg={colors.surfaceMuted}
            fg={colors.primary}
            compact
          />
        </View>
      </View>

      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TabButton
          label="Listings"
          active={tab === 'listings'}
          onPress={() => setTab('listings')}
          colors={colors}
        />
        <TabButton
          label="About"
          active={tab === 'about'}
          onPress={() => setTab('about')}
          colors={colors}
        />
      </View>
    </Animated.View>
  );

  if (tab === 'about') {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <TopBar colors={colors} insets={insets} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.listContent}>
          {Header}
          <View style={[styles.aboutCard, { backgroundColor: colors.surface }, SHADOWS.sm]}>
            {agent.bio ? (
              <Text style={[styles.aboutBio, { color: colors.text }]}>{agent.bio}</Text>
            ) : (
              <Text style={[styles.aboutBio, { color: colors.textMuted }]}>
                {t('common.noData', { defaultValue: 'No bio available' })}
              </Text>
            )}

            <View style={styles.aboutDivider} />

            {agent.email ? (
              <ContactRow icon="mail-outline" value={agent.email} colors={colors} />
            ) : null}
            {agent.phone ? (
              <ContactRow icon="call-outline" value={agent.phone} colors={colors} />
            ) : null}
            {agent.whatsapp ? (
              <ContactRow icon="logo-whatsapp" value={agent.whatsapp} colors={colors} />
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <TopBar colors={colors} insets={insets} onBack={() => navigation.goBack()} />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshing={listingsQuery.isRefetching}
        onRefresh={() => listingsQuery.refetch()}
        ListEmptyComponent={
          listingsQuery.isLoading ? (
            <View style={styles.centerWrap}>
              <BrandSpinner />
            </View>
          ) : (
            <View style={styles.centerWrap}>
              <EmptyState icon="home-outline" title={t('wishlist.listEmpty')} />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View>
            <ListingCard
              listing={item}
              variant="feed"
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

function TopBar({
  colors,
  insets,
  onBack,
}: {
  colors: ReturnType<typeof useColors>;
  insets: { top: number };
  onBack: () => void;
}) {
  return (
    <View
      style={[
        styles.topBar,
        {
          paddingTop: insets.top + SIZES.sm,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.topBarTitle, { color: colors.text }]}>Agent profile</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function Stat({
  value,
  label,
  colors,
}: {
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  bg,
  fg,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        compact && { flex: 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={fg} />
      {!compact ? (
        <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
      ) : (
        <Text style={[styles.actionLabel, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function TabButton({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabBtn,
        active && { borderBottomColor: colors.primary },
      ]}
    >
      <Text
        style={[
          styles.tabLabel,
          {
            color: active ? colors.primary : colors.textSecondary,
            fontFamily: active ? FONTS.bold : FONTS.medium,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ContactRow({
  icon,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.contactValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { padding: SIZES.xl, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
  },
  heroCard: {
    marginHorizontal: SIZES.lg,
    borderRadius: SIZES.borderRadiusLg,
    alignItems: 'center',
    padding: SIZES.xl,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: SIZES.md,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  heroName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
  },
  heroAgency: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: SIZES.xl,
    marginTop: SIZES.lg,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.title,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.lg,
    alignSelf: 'stretch',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius,
    flex: 1,
  },
  actionLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: SIZES.body,
  },
  listContent: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.huge,
  },
  aboutCard: {
    marginTop: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: SIZES.borderRadiusLg,
  },
  aboutBio: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    lineHeight: 22,
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: SIZES.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.sm,
  },
  contactValue: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    flex: 1,
  },
  error: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
});
