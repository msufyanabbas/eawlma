import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { agentsApi, messagesApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import EmptyState from '../components/EmptyState';
import UserAvatar from '../components/UserAvatar';

// Backend ConversationResponseDto exposes only participantIds (string[]),
// lastMessagePreview, unreadCount — there's no embedded user object. We mirror
// the web app: resolve the "other party" through /agents/:id for each unique
// participant ID. Buyer-only users won't resolve (the /agents endpoint hides
// non-agents) and we render a generic fallback for them.
export default function MessagesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { isAuthenticated, user } = useAuthStore();
  const currentUserId = user?.id;

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const conversations: any[] = useMemo(() => {
    const candidates = [
      data?.data?.data,
      data?.data?.items,
      data?.data,
      data?.items,
      data,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  }, [data]);

  const otherIds = useMemo(() => {
    if (!currentUserId) return [] as string[];
    const set = new Set<string>();
    for (const c of conversations) {
      const ids: string[] = c?.participantIds || [];
      const other = ids.find(id => id && id !== currentUserId);
      if (other) set.add(other);
    }
    return Array.from(set);
  }, [conversations, currentUserId]);

  const partyQueries = useQueries({
    queries: otherIds.map(id => ({
      queryKey: ['agent', id],
      queryFn: () => agentsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

  const partiesById = useMemo(() => {
    const out = new Map<string, any>();
    otherIds.forEach((id, idx) => {
      const data: any = (partyQueries[idx]?.data as any)?.data || partyQueries[idx]?.data;
      if (data?.id) out.set(id, data);
    });
    return out;
  }, [otherIds, partyQueries]);

  const getOtherParty = (conv: any) => {
    const ids: string[] = conv?.participantIds || [];
    const otherId = ids.find(id => id && id !== currentUserId);
    return otherId ? partiesById.get(otherId) : null;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>{isAr ? 'الرسائل' : 'Messages'}</Text>
        </View>
        <EmptyState
          icon="chatbubbles-outline"
          title={isAr ? 'سجل دخولك لرؤية رسائلك' : 'Sign in to see your messages'}
          actionLabel={isAr ? 'تسجيل الدخول' : 'Sign In'}
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>{isAr ? 'الرسائل' : 'Messages'}</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingBottom: SIZES.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }: any) => {
          const other = getOtherParty(item);
          const displayName = other
            ? `${other.firstName || ''} ${other.lastName || ''}`.trim()
            : (isAr ? 'مستخدم' : 'User');
          const preview =
            item.lastMessagePreview ||
            item.lastMessage?.body ||
            item.lastMessage?.content ||
            (isAr ? 'لا توجد رسائل' : 'No messages');
          return (
            <TouchableOpacity
              style={[
                styles.convCard,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.divider,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => navigation.navigate('Chat', {
                conversationId: item.id,
                recipientName: displayName,
              })}
            >
              <UserAvatar user={other || { id: item.id }} size={48} />
              <View style={styles.info}>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]} numberOfLines={1}>
                  {preview}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: '#FFF', fontWeight: '800' }]}>
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={isAr ? 'لا توجد رسائل' : 'No messages yet'}
            subtitle={isAr ? 'تواصل مع الوكلاء عبر صفحة العقار' : 'Contact agents from listing pages'}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: SIZES.lg },
  convCard: { alignItems: 'center', gap: SIZES.md, padding: SIZES.lg, borderBottomWidth: 1, ...SHADOWS.sm },
  info: { flex: 1 },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
});
