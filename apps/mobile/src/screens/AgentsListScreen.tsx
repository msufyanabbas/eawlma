import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { agentsApi, listingsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import UserAvatar from '../components/UserAvatar';

const { width: W } = Dimensions.get('window');

// Backend has no public agent-directory endpoint, so we mirror the web app's
// approach: pull recent listings, dedupe by ownerId, then resolve each owner
// via `/agents/:id`. Each owner is annotated with its listing count.
export default function AgentsListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const discover = useQuery({
    queryKey: ['agents-discover'],
    queryFn: () => listingsApi.search({ limit: 60 }),
    staleTime: 5 * 60_000,
  });

  const ownerCounts = useMemo(() => {
    const listings: any[] =
      discover.data?.data?.data ||
      discover.data?.data ||
      discover.data?.items ||
      [];
    const map = new Map<string, number>();
    for (const l of listings) {
      if (!l?.ownerId) continue;
      map.set(l.ownerId, (map.get(l.ownerId) || 0) + 1);
    }
    return map;
  }, [discover.data]);

  const ownerIds = useMemo(() => Array.from(ownerCounts.keys()), [ownerCounts]);

  const agentQueries = useQueries({
    queries: ownerIds.map(id => ({
      queryKey: ['agent', id],
      queryFn: () => agentsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

  const agents = useMemo(
    () =>
      agentQueries
        .map((q, idx) => {
          const data: any = (q.data as any)?.data || q.data;
          if (!data?.id) return null;
          return { ...data, listingCount: ownerCounts.get(ownerIds[idx]) || 0 };
        })
        .filter((a): a is any => Boolean(a)),
    [agentQueries, ownerCounts, ownerIds],
  );

  const isLoading = discover.isLoading || agentQueries.some(q => q.isLoading);
  const isRefetching = discover.isFetching;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('agents.title')} onBack={() => navigation.goBack()} />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
          columnWrapperStyle={{ gap: SIZES.sm }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => discover.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }: any) => {
            const cardWidth = (W - SIZES.lg * 2 - SIZES.sm) / 2;
            const fullName =
              `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
              t('agents.agent');
            return (
              <TouchableOpacity
                style={[styles.card, { width: cardWidth, backgroundColor: colors.surface, marginBottom: SIZES.sm }]}
                onPress={() => navigation.navigate('AgentProfile', { id: item.id })}
              >
                <UserAvatar user={item} size={72} />
                <View style={styles.nameRow}>
                  <Text
                    style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign: 'center' }]}
                    numberOfLines={1}
                  >
                    {fullName}
                  </Text>
                  {item.isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  )}
                </View>
                {item.agency?.name && (
                  <Text
                    style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}
                    numberOfLines={1}
                  >
                    {item.agency.name}
                  </Text>
                )}
                <View style={styles.statsRow}>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    {item.listingCount} {t('agents.listingsShort')}
                  </Text>
                  {item.averageRating != null && (
                    <Text style={[TYPOGRAPHY.caption, { color: colors.warning }]}>
                      ⭐ {Number(item.averageRating).toFixed(1)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('agents.noAgentsFound')}
              subtitle={t('agents.tryLater')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, alignItems: 'center', ...SHADOWS.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SIZES.sm },
  statsRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.xs, alignItems: 'center' },
});
