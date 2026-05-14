import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { messagesApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import EmptyState from '../components/EmptyState';

export default function MessagesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { isAuthenticated } = useAuthStore();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
    enabled: isAuthenticated,
  });

  const conversations: any[] = data?.data?.data || data?.data || [];

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
          const other = item.otherParty || {};
          const name = `${other.firstName || ''} ${other.lastName || ''}`.trim() || (isAr ? 'مستخدم' : 'User');
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
                recipientName: name,
              })}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[TYPOGRAPHY.h4, { color: '#FFF' }]}>
                  {other.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]} numberOfLines={1}>
                  {item.lastMessage?.content || (isAr ? 'لا توجد رسائل' : 'No messages')}
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
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
});
