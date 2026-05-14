import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { isAr, isRTL } = useRTL();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagesApi.getMessages(conversationId),
    refetchInterval: 3000,
    enabled: !!conversationId && conversationId !== 'new',
  });

  // Mark conversation as read on open (and when it changes).
  useEffect(() => {
    if (!conversationId || conversationId === 'new') return;
    messagesApi.markRead(conversationId).catch(() => undefined);
  }, [conversationId]);

  // Backend returns { data: { data: Message[], meta }, timestamp } after the
  // global TransformInterceptor wrap. Tolerate every plausible shape so a
  // future API change doesn't blank the chat.
  const rawMessages: any[] = useMemo(() => {
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

  // Inverted FlatList expects newest first. Backend returns newest-first too,
  // so we leave the order as-is.
  const messages = rawMessages;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !conversationId || conversationId === 'new') return;
    setSending(true);
    setDraft('');
    try {
      await messagesApi.sendMessage(conversationId, text);
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversations-unread'] });
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={recipientName || t('messages.chat')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item: any, idx) => item?.id || `tmp-${idx}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => {
            const isMe = item.senderId === user?.id;
            // Backend message DTO uses `body`; we still fall back to `content`
            // for resilience against an older payload shape.
            const text = item.body || item.content || '';
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
                    {text}
                  </Text>
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
                title={t('messages.noMessages')}
                subtitle={t('messages.startConversation')}
              />
            </View>
          }
        />

        <View style={[
          styles.composer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}>
          <TextInput
            style={[
              styles.composerInput,
              { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
            ]}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('messages.typeMessage')}
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
  composer: { alignItems: 'flex-end', gap: SIZES.sm, padding: SIZES.md, borderTopWidth: 1 },
  composerInput: { flex: 1, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.body, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
