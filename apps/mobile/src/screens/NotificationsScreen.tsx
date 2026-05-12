// NotificationsScreen — feed of in-app notifications. Tap to mark read; the
// "Mark all as read" header button fans out individual PATCH calls (the API
// doesn't yet expose a batch endpoint).
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient } from '@/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  createdAt: string;
  readAt?: string | null;
  entityId?: string | null;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  inquiry: 'chatbubble-ellipses-outline',
  message: 'mail-outline',
  booking: 'calendar-outline',
  listing: 'home-outline',
  payment: 'card-outline',
  system: 'information-circle-outline',
};

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

export function NotificationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data } = await apiClient.get<{ data: NotificationItem[] }>('/notifications');
      return data.data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = async () => {
    const items = list.data ?? [];
    const unread = items.filter((n) => !n.readAt);
    await Promise.allSettled(unread.map((n) => apiClient.patch(`/notifications/${n.id}/read`)));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const unreadCount = (list.data ?? []).filter((n) => !n.readAt).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={t('nav.notifications')}
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>
                {t('notifications.markAllRead', { defaultValue: 'Mark all read' })}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {list.isLoading ? (
        <View style={styles.center}>
          <BrandSpinner size={28} />
        </View>
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title={t('empty.noNotifications', { defaultValue: 'No notifications' })}
        />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const icon = TYPE_ICONS[item.type] ?? 'notifications-outline';
            const unread = !item.readAt;
            return (
              <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
                <Pressable
                  onPress={() => {
                    if (unread) markRead.mutate(item.id);
                  }}
                  style={[
                    styles.row,
                    {
                      backgroundColor: unread ? '#F5F1FF' : colors.surface,
                      borderColor: colors.border,
                    },
                    SHADOWS.sm,
                  ]}
                >
                  <View style={styles.iconBubble}>
                    <Ionicons name={icon} size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.title,
                        { color: colors.text, fontFamily: unread ? FONTS.bold : FONTS.medium },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.body ? (
                      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                      {formatRelative(item.createdAt)}
                    </Text>
                  </View>
                  {unread ? <View style={styles.dot} /> : null}
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SIZES.lg, paddingTop: SIZES.md, paddingBottom: SIZES.huge },
  markAllBtn: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  markAllText: { fontFamily: FONTS.bold, fontSize: SIZES.caption, color: COLORS.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
    marginBottom: SIZES.sm,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: SIZES.body },
  body: { fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: 2 },
  time: { fontFamily: FONTS.regular, fontSize: SIZES.caption, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.info,
  },
});
