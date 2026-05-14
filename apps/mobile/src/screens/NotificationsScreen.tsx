import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { notificationsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  message: 'chatbubble-ellipses',
  inquiry: 'mail',
  listing: 'home',
  commission: 'cash',
  booking: 'calendar',
  payment: 'card',
  system: 'notifications',
};

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
  });

  const items: any[] = data?.data?.data || data?.data || [];
  const unreadCount = items.filter(n => !n.readAt && !n.isRead).length;

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  };

  const formatTime = (iso?: string): string => {
    if (!iso) return '';
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={isAr ? 'الإشعارات' : 'Notifications'}
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={8}>
              <Ionicons name="checkmark-done" size={22} color="#FFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }: any) => {
            const isUnread = !item.readAt && !item.isRead;
            const iconName = TYPE_ICON[item.type] || 'notifications';
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderLeftColor: 'transparent',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                  isUnread && { borderLeftColor: colors.primary, backgroundColor: colors.primary + '08' },
                ]}
                onPress={() => isUnread && markRead(item.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={iconName} size={20} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text
                    style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}
                    numberOfLines={1}
                  >
                    {item.title || (isAr ? 'إشعار' : 'Notification')}
                  </Text>
                  <Text
                    style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]}
                    numberOfLines={2}
                  >
                    {item.body || item.message || ''}
                  </Text>
                  {item.createdAt && (
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textLight, marginTop: 4, textAlign }]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  )}
                </View>
                {isUnread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title={isAr ? 'لا توجد إشعارات' : 'No notifications'}
              subtitle={isAr ? 'ستظهر إشعاراتك هنا' : 'Your alerts will appear here'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: SIZES.md, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, borderLeftWidth: 3, ...SHADOWS.sm },
  iconBox: { width: 40, height: 40, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
