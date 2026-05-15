import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  // Viewer's preferred language. We compare primary subtags so "zh" matches
  // "zh-CN" — keeps us aligned with the web client's translation behavior.
  const displayLang = (i18n.language || 'en').split('-')[0].toLowerCase();

  // Cache of fetched translations per message id, plus a per-message toggle
  // that lets the user flip back to the original after seeing the translation.
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [inFlight, setInFlight] = useState<Record<string, boolean>>({});

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

  // Fetch a translation for a single inbound message, caching the result so
  // repeated renders of the same FlatList row don't re-trigger the request.
  const translateMessage = useCallback(
    async (messageId: string, fromLang: string) => {
      if (!messageId || !conversationId || conversationId === 'new') return;
      if (!fromLang) return;
      if (fromLang === displayLang) return;
      if (translations[messageId] || inFlight[messageId]) return;
      setInFlight(prev => ({ ...prev, [messageId]: true }));
      try {
        const res: any = await messagesApi.translate(
          conversationId,
          messageId,
          displayLang,
        );
        const translated =
          res?.data?.translatedText ??
          res?.translatedText ??
          (typeof res?.data === 'string' ? res.data : undefined);
        if (translated && typeof translated === 'string') {
          setTranslations(prev => ({ ...prev, [messageId]: translated }));
        }
      } catch {
        // Silently fall back to the original — translation is a nice-to-have.
      } finally {
        setInFlight(prev => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    [conversationId, displayLang, translations, inFlight],
  );

  // Auto-translate every inbound message whose detected language differs from
  // the viewer's language. The cache guard inside translateMessage stops us
  // from hammering the API as new messages arrive.
  useEffect(() => {
    if (!messages.length || !displayLang) return;
    messages.forEach((msg: any) => {
      if (!msg?.id) return;
      if (msg.senderId === user?.id) return;
      const source = (msg.detectedLanguage || '').split('-')[0].toLowerCase();
      if (!source || source === displayLang) return;
      void translateMessage(msg.id, source);
    });
  }, [messages, displayLang, user?.id, translateMessage]);

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
            const original = item.body || item.content || '';
            const translation = translations[item.id];
            const hasTranslation = !isMe && !!translation && translation !== original;
            const viewingOriginal = !!showOriginal[item.id];
            const isTranslating = !!inFlight[item.id] && !hasTranslation;
            const displayText = hasTranslation && !viewingOriginal ? translation : original;

            return (
              <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}>
                <View style={[
                  styles.bubble,
                  isMe
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
                ]}>
                  <Text style={[
                    TYPOGRAPHY.body,
                    { color: isMe ? '#FFF' : colors.text, lineHeight: 20 },
                  ]}>
                    {displayText}
                  </Text>

                  {isTranslating && (
                    <View style={[styles.translateRow, { opacity: 0.7 }]}>
                      <Ionicons
                        name="language-outline"
                        size={11}
                        color={isMe ? 'rgba(255,255,255,0.7)' : colors.primary}
                      />
                      <Text style={[
                        styles.translateText,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : colors.primary },
                      ]}>
                        {t('chat.translating')}
                      </Text>
                    </View>
                  )}

                  {hasTranslation && (
                    <TouchableOpacity
                      onPress={() => setShowOriginal(prev => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))}
                      style={styles.translateRow}
                    >
                      <Ionicons
                        name="language-outline"
                        size={11}
                        color={isMe ? 'rgba(255,255,255,0.7)' : colors.primary}
                      />
                      <Text style={[
                        styles.translateText,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : colors.primary },
                      ]}>
                        {viewingOriginal ? t('chat.showTranslation') : t('chat.showOriginal')}
                      </Text>
                    </TouchableOpacity>
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
  translateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  translateText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },
  composer: { alignItems: 'flex-end', gap: SIZES.sm, padding: SIZES.md, borderTopWidth: 1 },
  composerInput: { flex: 1, borderRadius: SIZES.borderRadiusLg, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, fontSize: SIZES.body, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
