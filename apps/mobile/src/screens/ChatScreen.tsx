import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { messagesApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatScreen({ navigation, route }: any) {
  const { conversationId, recipientName } = route.params;
  const { colors } = useTheme();
  const { isAr } = useRTL();
  const { user } = useAuthStore();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagesApi.getMessages(conversationId),
    refetchInterval: 5000,
    enabled: conversationId !== 'new',
  });

  const rawMessages: any[] = data?.data?.data || data?.data || [];
  // Inverted FlatList: newest first
  const messages = [...rawMessages].reverse();

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await messagesApi.sendMessage(conversationId, text);
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations-unread'] });
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={recipientName || (isAr ? 'محادثة' : 'Chat')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item: any) => item.id || String(Math.random())}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}>
                <View style={[
                  styles.bubble,
                  isMe
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
                ]}>
                  <Text style={[
                    TYPOGRAPHY.body,
                    { color: isMe ? '#FFF' : colors.text, lineHeight: 20 },
                  ]}>
                    {item.content}
                  </Text>
                  {item.isTranslated && (
                    <View style={styles.translatedBadge}>
                      <Ionicons
                        name="language"
                        size={9}
                        color={isMe ? 'rgba(255,255,255,0.7)' : colors.primary}
                      />
                      <Text style={[
                        TYPOGRAPHY.caption,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : colors.primary, fontWeight: '600' },
                      ]}>
                        {isAr ? 'مترجم' : 'Translated'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  TYPOGRAPHY.caption,
                  {
                    color: colors.textLight,
                    marginTop: 2,
                    [isMe ? 'marginRight' : 'marginLeft']: 4,
                  } as any,
                ]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <EmptyState
                icon="chatbubble-outline"
                title={isAr ? 'لا توجد رسائل بعد' : 'No messages yet'}
                subtitle={isAr ? 'ابدأ المحادثة الآن' : 'Send the first message'}
              />
            </View>
          }
        />

        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.composerInput,
              { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
            ]}
            value={draft}
            onChangeText={setDraft}
            placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlign={isAr ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!draft.trim() || sending) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: SIZES.lg, gap: SIZES.sm },
  bubbleWrap: { marginBottom: SIZES.xs },
  bubbleWrapMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { maxWidth: 280, padding: SIZES.md, borderRadius: SIZES.borderRadiusLg },
  translatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SIZES.sm, padding: SIZES.md, borderTopWidth: 1 },
  composerInput: { flex: 1, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.body, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
