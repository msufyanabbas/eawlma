// ChatScreen — full-screen 1:1 chat pushed from MessagesScreen. We use
// `react-native-gifted-chat` as the message list / composer; the bubble +
// input toolbar are themed to the Eawlma brand. A small "Translated" caption
// appears on bubbles whose ids end with `-tx` (UI-only stub until the
// translation API is wired) and lets the user toggle between original and
// translated text per-message.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bubble,
  GiftedChat,
  InputToolbar,
  Send,
  type IMessage,
  type SendProps,
  type BubbleProps,
  type InputToolbarProps,
} from 'react-native-gifted-chat';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, extractErrorMessage } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { FONTS, SIZES, useColors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

interface ThreadMessage {
  id: string;
  text: string;
  original?: string | null;
  createdAt: string;
  senderId: string;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
}

interface ThreadResponse {
  thread: {
    id: string;
    otherUser: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      online?: boolean;
      lastSeenAt?: string | null;
    };
  };
  messages: ThreadMessage[];
}

type ChatMessage = IMessage & { original?: string | null };

function toGiftedMessage(m: ThreadMessage): ChatMessage {
  return {
    _id: m.id,
    text: m.text,
    original: m.original ?? null,
    createdAt: new Date(m.createdAt),
    user: {
      _id: m.senderId,
      name: m.senderName ?? undefined,
      avatar: m.senderAvatarUrl ?? undefined,
    },
  };
}

export function ChatScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id) ?? 'anon';
  const { threadId } = route.params;
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string | number>>(new Set());

  const threadQuery = useQuery({
    queryKey: ['messages', 'thread', threadId],
    queryFn: async (): Promise<ThreadResponse> => {
      const { data } = await apiClient.get<ThreadResponse>(`/messages/threads/${threadId}`);
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await apiClient.post<ThreadMessage>(
        `/messages/threads/${threadId}`,
        { text },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    },
  });

  const messages = useMemo<ChatMessage[]>(() => {
    const list = threadQuery.data?.messages ?? [];
    // GiftedChat expects newest-first order.
    return [...list].map(toGiftedMessage).sort((a, b) => {
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }, [threadQuery.data]);

  const handleSend = useCallback(
    (sent: IMessage[]) => {
      const next = sent[0];
      if (!next?.text?.trim()) return;
      sendMutation.mutate(next.text.trim());
    },
    [sendMutation],
  );

  const toggleOriginal = useCallback((id: string | number) => {
    setShowOriginalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderBubble = useCallback(
    (props: BubbleProps<ChatMessage>) => {
      const msg = props.currentMessage as ChatMessage | undefined;
      if (!msg) {
        return <Bubble {...props} />;
      }
      const isTranslated =
        msg.system !== true &&
        typeof msg._id === 'string' &&
        msg._id.toString().endsWith('-tx');
      const showOriginal = showOriginalIds.has(msg._id);
      const displayText =
        isTranslated && showOriginal && msg.original ? msg.original : msg.text;
      return (
        <View>
          <Bubble
            {...props}
            currentMessage={{ ...msg, text: displayText }}
            wrapperStyle={{
              right: { backgroundColor: colors.primary, borderRadius: SIZES.borderRadiusLg },
              left: { backgroundColor: colors.surfaceMuted, borderRadius: SIZES.borderRadiusLg },
            }}
            textStyle={{
              right: { color: '#FFFFFF', fontFamily: FONTS.regular },
              left: { color: colors.text, fontFamily: FONTS.regular },
            }}
            timeTextStyle={{
              right: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.regular },
              left: { color: colors.textMuted, fontFamily: FONTS.regular },
            }}
          />
          {isTranslated ? (
            <TouchableOpacity
              onPress={() => toggleOriginal(msg._id)}
              hitSlop={6}
              style={[
                styles.translatedCaption,
                {
                  alignSelf: msg.user._id === myId ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <Ionicons name="language-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.translatedText, { color: colors.textMuted }]}>
                {showOriginal ? t('messages.showTranslation') : t('messages.translated')}
              </Text>
              {!showOriginal ? (
                <Text style={[styles.translatedDot, { color: colors.textMuted }]}>·</Text>
              ) : null}
              {!showOriginal ? (
                <Text style={[styles.translatedAction, { color: colors.primary }]}>
                  {t('messages.showOriginal')}
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [colors, myId, showOriginalIds, t, toggleOriginal],
  );

  const renderInputToolbar = useCallback(
    (props: InputToolbarProps<ChatMessage>) => (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: SIZES.sm,
        }}
        primaryStyle={{ alignItems: 'center' }}
      />
    ),
    [colors],
  );

  const renderSend = useCallback(
    (props: SendProps<ChatMessage>) => (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={[styles.sendButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </View>
      </Send>
    ),
    [colors],
  );

  const otherUser = threadQuery.data?.thread?.otherUser;
  const otherUserId = otherUser?.id ?? route.params.otherUserId;
  const otherName = otherUser?.name ?? '';
  const presence = otherUser?.online
    ? t('messages.online')
    : otherUser?.lastSeenAt
      ? `${t('messages.lastSeen')} ${new Date(otherUser.lastSeenAt).toLocaleDateString(i18n.language)}`
      : '';

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + SIZES.sm,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Pressable
          style={styles.headerUser}
          onPress={() => {
            if (otherUserId) navigation.navigate('AgentProfile', { id: otherUserId });
          }}
        >
          {otherUser?.avatarUrl ? (
            <Image
              source={{ uri: otherUser.avatarUrl }}
              style={styles.headerAvatar}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerAvatarText}>
                {(otherName?.trim()?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerUserText}>
            <Text numberOfLines={1} style={[styles.headerName, { color: colors.text }]}>
              {otherName || ' '}
            </Text>
            <View style={styles.headerPresenceRow}>
              {otherUser?.online ? (
                <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
              ) : null}
              {presence ? (
                <Text style={[styles.headerPresence, { color: colors.textSecondary }]}>
                  {presence}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </View>

      {threadQuery.isLoading ? (
        <View style={styles.centerWrap}>
          <BrandSpinner />
        </View>
      ) : threadQuery.isError ? (
        <View style={styles.centerWrap}>
          <Text style={[styles.error, { color: colors.error }]}>
            {extractErrorMessage(threadQuery.error)}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
        >
          <GiftedChat
            messages={messages}
            onSend={handleSend}
            user={{ _id: myId }}
            placeholder={t('messages.typeMessage')}
            renderBubble={renderBubble}
            renderInputToolbar={renderInputToolbar}
            renderSend={renderSend}
            alwaysShowSend
            scrollToBottom
            renderUsernameOnMessage={false}
            messagesContainerStyle={{ backgroundColor: colors.background }}
            textInputStyle={{
              color: colors.text,
              fontFamily: FONTS.regular,
              fontSize: SIZES.body,
            }}
          />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.borderRadius,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
  },
  headerUserText: {
    flex: 1,
  },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
  },
  headerPresenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerPresence: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 4,
  },
  translatedCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginHorizontal: SIZES.md,
    marginTop: 2,
    marginBottom: SIZES.xs,
  },
  translatedText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
  },
  translatedDot: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
  },
  translatedAction: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.caption,
  },
  error: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
});
