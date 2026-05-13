import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api';
import { COLORS, SIZES } from '../theme';

export default function MessagesScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { isAuthenticated } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations').then(r => r.data),
    enabled: isAuthenticated,
  });

  const conversations = data?.data?.data || data?.data || [];

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isAr ? 'الرسائل' : 'Messages'}</Text>
        </View>
        <View style={styles.authPrompt}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.authTitle}>
            {isAr ? 'سجل دخولك لرؤية رسائلك' : 'Sign in to see your messages'}
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.authBtnText}>
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isAr ? 'الرسائل' : 'Messages'}</Text>
      </View>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {isAr ? 'لا توجد رسائل' : 'No messages yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isAr
              ? 'تواصل مع الوكلاء عبر صفحة العقار'
              : 'Contact agents from listing pages'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.convCard}
              onPress={() => navigation.navigate('Chat', {
                conversationId: item.id,
                recipientName: item.otherParty?.firstName + ' ' + item.otherParty?.lastName,
              })}
            >
              <View style={styles.convAvatar}>
                <Text style={styles.convAvatarText}>
                  {item.otherParty?.firstName?.[0] || '?'}
                </Text>
              </View>
              <View style={styles.convInfo}>
                <Text style={styles.convName}>
                  {item.otherParty?.firstName} {item.otherParty?.lastName}
                </Text>
                <Text style={styles.convLast} numberOfLines={1}>
                  {item.lastMessage?.content || (isAr ? 'لا توجد رسائل' : 'No messages')}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.h3, fontWeight: '800', color: '#FFF' },
  list: { paddingBottom: SIZES.xxxl },
  convCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SIZES.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  convAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md },
  convAvatarText: { fontSize: SIZES.title, fontWeight: '800', color: '#FFF' },
  convInfo: { flex: 1 },
  convName: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  convLast: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  unreadBadge: { backgroundColor: COLORS.primary, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadText: { fontSize: 11, color: '#FFF', fontWeight: '800' },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  authTitle: { fontSize: SIZES.subtitle, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginTop: SIZES.lg },
  authBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.xxxl, paddingVertical: SIZES.md, marginTop: SIZES.xl },
  authBtnText: { color: '#FFF', fontWeight: '700', fontSize: SIZES.bodyLg },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  emptyText: { fontSize: SIZES.subtitle, fontWeight: '700', color: COLORS.text, marginTop: SIZES.lg, textAlign: 'center' },
  emptySubtext: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.sm, textAlign: 'center' },
});
