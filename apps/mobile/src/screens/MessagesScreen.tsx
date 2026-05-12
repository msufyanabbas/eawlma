// MessagesScreen — conversation list (Messages tab). Pulls threads from
// `/messages/threads` (the backend isn't wired yet, but the endpoint shape is
// stable). Each row navigates into the full-screen `ChatScreen`. Unauthenticated
// users see a sign-in prompt instead of the list so we don't fire requests
// against the API anonymously.
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandSpinner } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { apiClient, extractErrorMessage } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { FONTS, SIZES, useColors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

interface ConversationThread {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ThreadListResponse {
  data: ConversationThread[];
}

async function fetchThreads(): Promise<ConversationThread[]> {
  const { data } = await apiClient.get<ThreadListResponse>('/messages/threads');
  return data?.data ?? [];
}

function formatRelativeTime(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  } catch {
    return '';
  }
}

export function MessagesScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const [query, setQuery] = useState('');

  const threadsQuery = useQuery({
    queryKey: ['messages', 'threads'],
    queryFn: fetchThreads,
    enabled: !!token,
  });

  const filtered = useMemo(() => {
    const list = threadsQuery.data ?? [];
    if (!query.trim()) return list;
    const needle = query.trim().toLowerCase();
    return list.filter((thread) => thread.otherUserName.toLowerCase().includes(needle));
  }, [threadsQuery.data, query]);

  if (!token) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('nav.messages')}</Text>
        </View>
        <View style={styles.centerWrap}>
          <EmptyState
            icon="chatbubbles-outline"
            title={t('messages.startConversation', { defaultValue: 'Sign in to view your messages' })}
            body={t('wishlist.signInDesc')}
            ctaLabel={t('auth.signIn')}
            onCta={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('nav.messages')}</Text>
      </View>
      <View style={styles.searchWrap}>
        <SearchBar
          placeholder={t('messages.searchConversations')}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {threadsQuery.isLoading ? (
        <View style={styles.centerWrap}>
          <BrandSpinner />
        </View>
      ) : threadsQuery.isError ? (
        <View style={styles.centerWrap}>
          <Text style={[styles.error, { color: colors.error }]}>
            {extractErrorMessage(threadsQuery.error)}
          </Text>
          <Button mode="contained" onPress={() => threadsQuery.refetch()} buttonColor={colors.primary}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerWrap}>
          <EmptyState icon="chatbubbles-outline" title={t('messages.noConversations')} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={threadsQuery.isRefetching}
          onRefresh={() => threadsQuery.refetch()}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
              <Pressable
                onPress={() =>
                  navigation.navigate('Chat', {
                    threadId: item.id,
                    otherUserId: item.otherUserId,
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                    borderBottomColor: colors.divider,
                  },
                ]}
              >
                <Avatar
                  uri={item.otherUserAvatarUrl}
                  name={item.otherUserName}
                  primaryColor={colors.primary}
                />
                <View style={styles.rowBody}>
                  <View style={styles.rowTopLine}>
                    <Text numberOfLines={1} style={[styles.rowName, { color: colors.text }]}>
                      {item.otherUserName}
                    </Text>
                    <Text style={[styles.rowTime, { color: colors.textMuted }]}>
                      {formatRelativeTime(item.lastMessageAt, i18n.language)}
                    </Text>
                  </View>
                  <View style={styles.rowBottomLine}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.rowPreview,
                        {
                          color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                          fontFamily: item.unreadCount > 0 ? FONTS.medium : FONTS.regular,
                        },
                      ]}
                    >
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

function Avatar({
  uri,
  name,
  primaryColor,
}: {
  uri?: string | null;
  name: string;
  primaryColor: string;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  if (uri) {
    return (
      <Image source={{ uri }} style={styles.avatar} contentFit="cover" transition={120} />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: primaryColor }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.lg },
  headerBar: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
  },
  searchWrap: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  listContent: {
    paddingBottom: SIZES.huge,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    color: '#FFFFFF',
  },
  rowBody: {
    flex: 1,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.sm,
  },
  rowName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    flex: 1,
  },
  rowTime: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
  },
  rowBottomLine: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  rowPreview: {
    flex: 1,
    fontSize: SIZES.small,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: SIZES.caption,
  },
  error: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
});
