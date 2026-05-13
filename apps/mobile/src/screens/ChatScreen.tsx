import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api';
import { COLORS, SIZES } from '../theme';

export default function ChatScreen({ navigation, route }: any) {
  const { conversationId, recipientName } = route.params;
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuthStore();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.get(`/conversations/${conversationId}/messages`).then(r => r.data),
    refetchInterval: 3000,
    enabled: conversationId !== 'new',
  });

  const messages = data?.data?.data || data?.data || [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await api.post(`/conversations/${conversationId}/messages`, { content: text });
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons
            name={isAr ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipientName}</Text>
          <Text style={styles.headerStatus}>
            {isAr ? 'متصل الآن' : 'Online'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item: any) => item.id || String(Math.random())}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && { color: '#FFF' }]}>
                    {item.content}
                  </Text>
                  {item.isTranslated && (
                    <View style={styles.translatedBadge}>
                      <Ionicons name="language" size={9} color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.primary} />
                      <Text style={[styles.translatedText, { color: isMe ? 'rgba(255,255,255,0.7)' : COLORS.primary }]}>
                        {isAr ? 'مترجم' : 'Translated'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {isAr ? 'لا توجد رسائل بعد' : 'No messages yet'}
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            textAlign={isAr ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !draft.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, backgroundColor: COLORS.primary, padding: SIZES.lg },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: '#FFF' },
  headerStatus: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.75)' },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  bubbleWrap: { flexDirection: 'row' },
  bubbleWrapMe: { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', padding: SIZES.md, borderRadius: SIZES.borderRadiusLg },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: SIZES.body, color: COLORS.text, lineHeight: 20 },
  translatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  translatedText: { fontSize: 10, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SIZES.sm, padding: SIZES.md, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  composerInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.body, color: COLORS.text, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', padding: SIZES.xxxl },
  emptyText: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.md },
});
