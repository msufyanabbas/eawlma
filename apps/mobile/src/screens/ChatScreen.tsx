// Custom 1:1 chat — no react-native-gifted-chat, no keyboard-controller,
// no community packages beyond what the rest of the app already uses
// (FlatList + TextInput + Reanimated + expo-image). Inverted FlatList means
// the message array stays oldest→newest server-side, we just feed it the
// reverse so the newest bubble pins to the bottom and the keyboard pushes
// the input up cleanly. Brand-purple bubbles for "me", neutral for the
// other party, plus a per-message "Translated" caption that flips between
// the live translation and the original text.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

export function ChatScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id) ?? 'anon';
  const { threadId } = route.params;

  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const [draft, setDraft] = useState('');
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());

  const threadQuery = useQuery({
    queryKey: ['messages', 'thread', threadId],
    queryFn: async (): Promise<ThreadResponse> => {
      const { data } = await apiClient.get<ThreadResponse>(`/messages/threads/${threadId}`);
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await apiClient.post<ThreadMessage>(`/messages/threads/${threadId}`, {
        text,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    },
  });

  // Inverted list — newest first. We sort defensively so the server can return
  // either order and the UI stays right.
  const messages = useMemo<ThreadMessage[]>(() => {
    const list = threadQuery.data?.messages ?? [];
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [threadQuery.data]);

  const toggleOriginal = useCallback((id: string) => {
    setShowOriginalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setDraft('');
  }, [draft, sendMutation]);

  const otherUser = threadQuery.data?.thread?.otherUser;
  const otherUserId = otherUser?.id ?? route.params.otherUserId;
  const otherName = otherUser?.name ?? '';
  const presence = otherUser?.online
    ? t('messages.online')
    : otherUser?.lastSeenAt
      ? `${t('messages.lastSeen')} ${new Date(otherUser.lastSeenAt).toLocaleDateString(i18n.language)}`
      : '';

  const renderItem = useCallback(
    ({ item, index }: { item: ThreadMessage; index: number }) => {
      const isMine = item.senderId === myId;
      const isTranslated =
        typeof item.id === 'string' && item.id.endsWith('-tx') && Boolean(item.original);
      const showOriginal = showOriginalIds.has(item.id);
      const displayText = isTranslated && showOriginal && item.original ? item.original : item.text;
      // In an inverted FlatList, index 0 is the *bottom* visually; the
      // "previous" message in time appears at index+1.
      const previous = messages[index + 1];
      const sameAuthorAsPrev = previous && previous.senderId === item.senderId;
      const showAvatar = !isMine && !sameAuthorAsPrev;

      return (
        <Animated.View
          entering={FadeInUp.duration(180).easing(Easing.out(Easing.cubic))}
          style={[
            styles.row,
            { justifyContent: isMine ? 'flex-end' : 'flex-start' },
          ]}
        >
          {!isMine ? (
            <View style={styles.avatarSlot}>
              {showAvatar ? (
                item.senderAvatarUrl ? (
                  <Image
                    source={{ uri: item.senderAvatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.avatarText}>
                      {(item.senderName?.trim()?.[0] ?? otherName?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
          ) : null}

          <View style={styles.bubbleColumn}>
            <View
              style={[
                styles.bubble,
                isMine
                  ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                  : [styles.bubbleOther, { backgroundColor: colors.surfaceMuted }],
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: isMine ? '#FFFFFF' : colors.text },
                ]}
              >
                {displayText}
              </Text>
              <Text
                style={[
                  styles.bubbleTime,
                  { color: isMine ? 'rgba(255,255,255,0.72)' : colors.textMuted },
                ]}
              >
                {new Date(item.createdAt).toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {isTranslated ? (
              <TouchableOpacity
                onPress={() => toggleOriginal(item.id)}
                hitSlop={6}
                style={[
                  styles.translatedCaption,
                  { alignSelf: isMine ? 'flex-end' : 'flex-start' },
                ]}
              >
                <Ionicons name="language-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.translatedText, { color: colors.textMuted }]}>
                  {showOriginal ? t('messages.showTranslation') : t('messages.translated')}
                </Text>
                <Text style={[styles.translatedDot, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.translatedAction, { color: colors.primary }]}>
                  {showOriginal ? t('messages.showTranslation') : t('messages.showOriginal')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      );
    },
    [colors, i18n.language, messages, myId, otherName, showOriginalIds, t, toggleOriginal],
  );

  // Send button: scale-down feedback on press and a fade between
  // active (purple) and disabled (muted) states.
  const sendScale = useSharedValue(1);
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));
  const canSend = draft.trim().length > 0 && !sendMutation.isPending;

  // Auto-scroll to bottom (top of inverted list) when sending so the user's
  // freshly-sent message is visible. Server invalidation will re-render
  // and the inverted list keeps the new entry at index 0 automatically.
  useEffect(() => {
    if (sendMutation.isSuccess) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [sendMutation.isSuccess]);

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
            <View
              style={[styles.headerAvatar, styles.avatarFallback, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.avatarText}>
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
          <FlatList<ThreadMessage>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            removeClippedSubviews
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('messages.startConversation')}
                </Text>
              </View>
            }
          />

          <View
            style={[
              styles.composer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom > 0 ? insets.bottom : SIZES.md,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('messages.typeMessage')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceMuted,
                  fontFamily: FONTS.regular,
                },
              ]}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Animated.View style={sendAnimatedStyle}>
              <Pressable
                disabled={!canSend}
                onPress={handleSend}
                onPressIn={() => (sendScale.value = withTiming(0.9, { duration: 80 }))}
                onPressOut={() =>
                  (sendScale.value = withSpring(1, { damping: 12, stiffness: 240 }))
                }
                hitSlop={4}
                style={[
                  styles.sendButton,
                  { backgroundColor: canSend ? colors.primary : colors.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('messages.send')}
              >
                {sendMutation.isPending ? (
                  <BrandSpinner size={18} />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={canSend ? '#FFFFFF' : colors.textMuted}
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>
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
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerUserText: { flex: 1 },
  headerName: { fontFamily: FONTS.bold, fontSize: SIZES.bodyLg },
  headerPresenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  headerPresence: { fontFamily: FONTS.regular, fontSize: SIZES.caption },

  listContent: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    gap: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    gap: SIZES.sm,
  },
  avatarSlot: {
    width: 28,
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: SIZES.small },

  bubbleColumn: { maxWidth: '78%' },
  bubble: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusLg,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: SIZES.body, lineHeight: 20 },
  bubbleTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  translatedCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  translatedText: { fontFamily: FONTS.medium, fontSize: SIZES.caption },
  translatedDot: { fontFamily: FONTS.medium, fontSize: SIZES.caption },
  translatedAction: { fontFamily: FONTS.bold, fontSize: SIZES.caption },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: SIZES.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: SIZES.borderRadiusXl,
    fontSize: SIZES.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleY: -1 }],
    padding: SIZES.xl,
  },
  emptyText: { fontFamily: FONTS.medium, fontSize: SIZES.body, textAlign: 'center' },

  error: { fontFamily: FONTS.medium, fontSize: SIZES.body, textAlign: 'center' },
});
