import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AttachIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import TranslateIcon from '@mui/icons-material/Translate';
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  type Conversation,
  type Listing,
  type Message,
} from '@eawlma/shared-types';

import { messagingApi } from '@/api/messaging.api';
import { listingsApi } from '@/api/listings.api';
import { agentsApi } from '@/api/agents.api';
import { storageApi } from '@/api/storage.api';
import { getListingTitle } from '@/utils/listingText';
import { getMessagingSocket } from '@/api/realtime';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { EmptyState } from '@/components/global/EmptyState';

const PAGE_SIZE = 30;

type ConversationRow = Conversation & { unreadCount?: number };

export function MessagesPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const setUnread = useUiStore((s) => s.setUnreadMessageCount);
  const displayLocale = useUiStore((s) => s.displayLocale);

  // Deep-links from agent profile / listing detail / inquiry success:
  //   ?conversationId=… selects an exact thread by id.
  //   ?agentId=…       finds the existing thread with this agent.
  // If the conversation doesn't exist yet we surface a "Start conversation"
  // prompt so the user knows what's expected.
  const routeSearch = useSearch({ strict: false }) as {
    agentId?: string;
    conversationId?: string;
  };
  const requestedAgentId = routeSearch.agentId ?? null;
  const requestedConversationId = routeSearch.conversationId ?? null;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [typingFromOther, setTypingFromOther] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Conversations -------------------------------------------------
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingApi.list({ limit: 100 }),
    refetchInterval: 60_000, // safety net in addition to sockets
  });

  const conversations = (conversationsQuery.data?.data ?? []) as ConversationRow[];

  // Resolve the listing title + the "other party" name for every visible
  // conversation so the sidebar shows e.g. "Villa in Olaya — Sarah" instead
  // of "Conversation 02e9d5". Listings come from /listings/:id; the other
  // participant is fetched via /agents/:id (agent profiles are public — buyer
  // profiles aren't, so this resolves only when the other side is an agent).
  const listingIds = useMemo(
    () => Array.from(new Set(conversations.map((c) => c.listingId).filter(Boolean) as string[])),
    [conversations],
  );
  const listingQueries = useQueries({
    queries: listingIds.map((id) => ({
      queryKey: ['listings', id],
      queryFn: () => listingsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const listingsById = useMemo(() => {
    const out = new Map<string, Listing>();
    listingIds.forEach((id, idx) => {
      const data = listingQueries[idx]?.data;
      if (data) out.set(id, data);
    });
    return out;
  }, [listingIds, listingQueries]);

  const otherIdsForLookup = useMemo(() => {
    if (!userId) return [] as string[];
    return Array.from(
      new Set(
        conversations
          .map((c) => c.participantIds.find((p) => p !== userId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }, [conversations, userId]);
  const partyQueries = useQueries({
    queries: otherIdsForLookup.map((id) => ({
      queryKey: ['agents', id],
      queryFn: () => agentsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const partiesById = useMemo(() => {
    const out = new Map<string, { name: string; avatarUrl: string | null }>();
    otherIdsForLookup.forEach((id, idx) => {
      const data = partyQueries[idx]?.data;
      if (data) {
        out.set(id, {
          name: `${data.firstName} ${data.lastName}`.trim(),
          avatarUrl: data.avatarUrl,
        });
      }
    });
    return out;
  }, [otherIdsForLookup, partyQueries]);

  const conversationDisplay = (conv: Conversation) => {
    const otherId = userId ? conv.participantIds.find((p) => p !== userId) : undefined;
    const otherName = otherId ? partiesById.get(otherId)?.name : undefined;
    const otherAvatar = otherId ? partiesById.get(otherId)?.avatarUrl ?? null : null;
    const listing = conv.listingId ? listingsById.get(conv.listingId) : undefined;
    const listingTitle = listing ? getListingTitle(listing, i18n.language) : undefined;
    const fallback = conv.listingId ? `Conversation ${conv.id.slice(0, 6)}` : t('empty.noMessages');
    return {
      title: otherName || listingTitle || fallback,
      subtitle: otherName && listingTitle ? listingTitle : undefined,
      avatarUrl: otherAvatar,
      avatarFallback: (otherName ?? listingTitle ?? '?').charAt(0).toUpperCase(),
    };
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const display = conversationDisplay(c);
      return (
        (c.lastMessagePreview ?? '').toLowerCase().includes(q) ||
        display.title.toLowerCase().includes(q) ||
        (display.subtitle ?? '').toLowerCase().includes(q)
      );
    });
    // conversationDisplay closes over listingsById/partiesById, so re-run when
    // either changes. Direct deps keep the memo cache valid without lying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, search, listingsById, partiesById, userId, i18n.language]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Default to first conversation on first load — but if a deep-link is
  // present, auto-select the requested thread. ?conversationId wins over
  // ?agentId when both are set.
  useEffect(() => {
    if (activeId) return;
    if (requestedConversationId) {
      const match = conversations.find((c) => c.id === requestedConversationId);
      if (match) {
        setActiveId(match.id);
        return;
      }
      return;
    }
    if (requestedAgentId) {
      const match = conversations.find((c) => c.participantIds.includes(requestedAgentId));
      if (match) {
        setActiveId(match.id);
        return;
      }
      // Otherwise leave activeId null — the "no conversation yet" empty state
      // renders a Start-conversation prompt below.
      return;
    }
    if (conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations, requestedAgentId, requestedConversationId]);

  const requestedAgentHasNoThread =
    Boolean(requestedAgentId) &&
    !activeId &&
    !conversationsQuery.isLoading &&
    !conversations.some((c) => c.participantIds.includes(requestedAgentId!));

  // ---- Messages (paginated, oldest-first scroll) ----------------------
  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', activeId],
    queryFn: ({ pageParam = 1 }) =>
      messagingApi.messages(activeId!, { page: pageParam as number, limit: PAGE_SIZE }),
    enabled: Boolean(activeId),
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
  });

  // Backend returns newest-first; flip for chronological display.
  const messages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return [];
    const all = messagesQuery.data.pages.flatMap((p) => p.data);
    return [...all].reverse();
  }, [messagesQuery.data]);

  // ---- Listing snapshot (for chat header) ----------------------------
  const listingId = activeConversation?.listingId ?? null;
  const listingQuery = useQuery({
    queryKey: ['listings', listingId],
    queryFn: () => listingsApi.getById(listingId!),
    enabled: Boolean(listingId),
  });

  // ---- Socket lifecycle ----------------------------------------------
  useEffect(() => {
    if (!activeId || !userId) return;
    const socket = getMessagingSocket();

    const join = () => socket.emit('joinConversation', { conversationId: activeId });
    if (socket.connected) join();
    else socket.once('connect', join);

    const onMessage = (msg: Message) => {
      if (msg.conversationId !== activeId) return;
      qc.setQueryData(['messages', activeId], (data: typeof messagesQuery.data) => {
        if (!data) return data;
        const pages = data.pages.map((p, idx) =>
          idx === 0 ? { ...p, data: [msg, ...p.data] } : p,
        );
        return { ...data, pages };
      });
      // If the incoming message is from someone else, mark as read
      if (msg.senderId !== userId) {
        socket.emit('markAsRead', { conversationId: activeId });
      }
    };

    const onTyping = (e: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (e.conversationId !== activeId || e.userId === userId) return;
      setTypingFromOther(e.isTyping);
      if (e.isTyping) {
        // auto-clear after 3s if we don't get an "off" event
        setTimeout(() => setTypingFromOther(false), 3000);
      }
    };

    const onRead = (e: { conversationId: string; readerId: string }) => {
      if (e.conversationId !== activeId) return;
      qc.setQueryData(['messages', activeId], (data: typeof messagesQuery.data) => {
        if (!data) return data;
        const pages = data.pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (m.readBy.includes(e.readerId)) return m;
            return { ...m, readBy: [...m.readBy, e.readerId] };
          }),
        }));
        return { ...data, pages };
      });
    };

    const onConvUpdated = () => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('readReceipt', onRead);
    socket.on('conversation:updated', onConvUpdated);

    // Mark this conversation as read on open.
    socket.emit('markAsRead', { conversationId: activeId });
    void messagingApi.markRead(activeId).catch(() => undefined);

    return () => {
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
      socket.off('readReceipt', onRead);
      socket.off('conversation:updated', onConvUpdated);
      socket.emit('leaveConversation', { conversationId: activeId });
    };
  }, [activeId, userId, qc]);

  // ---- Auto-scroll to latest -----------------------------------------
  const lastMessageId = messages[messages.length - 1]?.id;
  useLayoutEffect(() => {
    const el = messageContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastMessageId, activeId]);

  // ---- Load older messages on scroll-to-top --------------------------
  const onMessagesScroll = () => {
    const el = messageContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      const before = el.scrollHeight;
      void messagesQuery.fetchNextPage().then(() => {
        // Preserve scroll position relative to the bottom
        requestAnimationFrame(() => {
          if (!messageContainerRef.current) return;
          const after = messageContainerRef.current.scrollHeight;
          messageContainerRef.current.scrollTop = after - before + el.scrollTop;
        });
      });
    }
  };

  // ---- Send -----------------------------------------------------------
  const sendDraft = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    const socket = getMessagingSocket();
    socket.emit('sendMessage', { conversationId: activeId, body });
    setDraft('');
  };

  // ---- Typing indicator (debounced) ----------------------------------
  const typingTimer = useRef<number | null>(null);
  const onDraftChange = (v: string) => {
    setDraft(v);
    if (!activeId) return;
    const socket = getMessagingSocket();
    socket.emit('typing', { conversationId: activeId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      socket.emit('typing', { conversationId: activeId, isTyping: false });
    }, 1500);
  };

  // ---- Image attachment ----------------------------------------------
  const onAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    try {
      const { publicUrl } = await storageApi.uploadFile(file, 'image', 'documents');
      const socket = getMessagingSocket();
      socket.emit('sendMessage', { conversationId: activeId, body: '📎 image', attachmentUrls: [publicUrl] });
    } catch (err) {
      // surface in console; a toast would be nicer
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  // ---- Sidebar unread count mirror -----------------------------------
  useEffect(() => {
    const total = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
    setUnread(total);
  }, [conversations, setUnread]);

  // ---- Render ---------------------------------------------------------
  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('dashboard.messages')} — {t('app.name')}</title>
      </Helmet>

      <Box
        sx={{
          height: { xs: 'calc(100vh - 64px - 32px)', md: 'calc(100vh - 64px - 64px)' },
          display: 'flex',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {/* ---------------- Conversation list ---------------- */}
        <Box
          sx={{
            width: { xs: showListOnMobile ? '100%' : 0, md: 320 },
            display: { xs: showListOnMobile ? 'flex' : 'none', md: 'flex' },
            flexDirection: 'column',
            // Logical property — RTL flex order moves the list to the right
            // side, so the divider should follow it (inline-end of the list).
            borderInlineEnd: { md: 1 },
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 999 },
              }}
            />
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {conversationsQuery.isLoading ? (
              [...Array(6)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 2 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Stack sx={{ flex: 1 }} spacing={0.5}>
                    <Skeleton width="60%" />
                    <Skeleton width="80%" />
                  </Stack>
                </Box>
              ))
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                title={t('empty.noMessages')}
                description="Start a conversation by messaging an agent from any listing page."
                ctaLabel={t('nav.search')}
                onCta={() => { window.location.href = '/search'; }}
              />
            ) : (
              filteredConversations.map((c) => {
                const display = conversationDisplay(c);
                return (
                  <ConversationRowItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    title={display.title}
                    subtitle={display.subtitle}
                    avatarUrl={display.avatarUrl}
                    avatarFallback={display.avatarFallback}
                    onClick={() => {
                      setActiveId(c.id);
                      setShowListOnMobile(false);
                    }}
                  />
                );
              })
            )}
          </Box>
        </Box>

        {/* ---------------- Chat window ---------------- */}
        <Box
          sx={{
            flex: 1,
            display: { xs: showListOnMobile ? 'none' : 'flex', md: 'flex' },
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {!activeConversation ? (
            requestedAgentHasNoThread ? (
              <EmptyState
                title="Start the conversation"
                description={`You don't have a thread with this agent yet. Open one of their listings and use the "Send inquiry" form to reach them — your messages will then appear here.`}
                ctaLabel="Browse this agent's listings"
                onCta={() =>
                  (window.location.href = `/agents/${requestedAgentId}`)
                }
              />
            ) : (
              <EmptyState title={t('empty.noMessages')} description="Pick a conversation on the left to start chatting." />
            )
          ) : (
            <>
              {/* Header */}
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <IconButton
                  onClick={() => setShowListOnMobile(true)}
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  aria-label="back"
                >
                  <ArrowBackIcon
                    sx={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
                  />
                </IconButton>

                {(() => {
                  const display = conversationDisplay(activeConversation);
                  return (
                    <>
                      <Avatar
                        src={display.avatarUrl ?? undefined}
                        sx={{ bgcolor: 'primary.main' }}
                      >
                        {display.avatarFallback}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                          {display.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {typingFromOther
                            ? 'typing…'
                            : display.subtitle ??
                              (activeConversation.lastMessageAt
                                ? `last message ${new Date(activeConversation.lastMessageAt).toLocaleString(i18n.language)}`
                                : '—')}
                        </Typography>
                      </Box>
                    </>
                  );
                })()}

                {listingQuery.data && (
                  <Button
                    component={Link}
                    to={'/listings/$id' as never}
                    params={{ id: listingQuery.data.id } as never}
                    size="small"
                    variant="outlined"
                  >
                    View listing
                  </Button>
                )}
              </Stack>

              {/* Listing thumbnail strip */}
              {listingQuery.data?.media?.[0] && (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2, py: 1.25, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      backgroundImage: `url(${listingQuery.data.media[0].thumbnailUrl ?? listingQuery.data.media[0].url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{listingQuery.data.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Number(listingQuery.data.price).toLocaleString(i18n.language)} {t('listing.currency')} · {listingQuery.data.referenceCode}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {/* Messages */}
              <Box
                ref={messageContainerRef}
                onScroll={onMessagesScroll}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                }}
              >
                {messagesQuery.isFetchingNextPage && (
                  <Stack alignItems="center" sx={{ py: 1 }}>
                    <CircularProgress size={18} />
                  </Stack>
                )}
                <Stack spacing={1}>
                  {messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      mine={m.senderId === userId}
                      otherIds={activeConversation.participantIds.filter((p) => p !== userId)}
                      conversationId={activeConversation.id}
                      displayLocale={displayLocale}
                    />
                  ))}
                  {typingFromOther && <TypingDots />}
                </Stack>
              </Box>

              {/* Input */}
              <Box
                component="form"
                onSubmit={sendDraft}
                sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton onClick={() => fileInputRef.current?.click()} aria-label="attach">
                    <AttachIcon />
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onAttach}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    multiline
                    maxRows={5}
                    InputProps={{ sx: { borderRadius: 4 } }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendDraft();
                      }
                    }}
                  />
                  <IconButton
                    type="submit"
                    color="primary"
                    sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
                    disabled={!draft.trim()}
                    aria-label="send"
                  >
                    <SendIcon />
                  </IconButton>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function ConversationRowItem({
  conversation,
  active,
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  onClick,
}: {
  conversation: ConversationRow;
  active: boolean;
  title: string;
  subtitle?: string;
  avatarUrl: string | null;
  avatarFallback: string;
  onClick: () => void;
}) {
  const { i18n } = useTranslation();
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        bgcolor: active ? 'primary.50' : 'background.paper',
        borderInlineStart: 3,
        borderColor: active ? 'primary.main' : 'transparent',
        '&:hover': { bgcolor: active ? 'primary.50' : 'background.default' },
      }}
    >
      <Badge
        badgeContent={conversation.unreadCount}
        color="error"
        max={99}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Avatar src={avatarUrl ?? undefined}>{avatarFallback}</Avatar>
      </Badge>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {conversation.lastMessageAt
              ? new Date(conversation.lastMessageAt).toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {subtitle ?? conversation.lastMessagePreview ?? '—'}
        </Typography>
      </Box>
    </Box>
  );
}

function MessageBubble({
  message,
  mine,
  otherIds,
  conversationId,
  displayLocale,
}: {
  message: Message;
  mine: boolean;
  otherIds: string[];
  conversationId: string;
  displayLocale: string;
}) {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const seenByOther = otherIds.length > 0 && otherIds.some((id) => message.readBy.includes(id));

  // Translate only inbound messages, and only when the source language is
  // either unknown or different from the viewer's chosen display locale.
  // `langsMatch` compares primary subtags so "zh" matches "zh-CN".
  const target = (displayLocale || '').split('-')[0]?.toLowerCase() || '';
  const source = (message.detectedLanguage || '').split('-')[0]?.toLowerCase() || '';
  const needsTranslation = !mine && Boolean(target) && Boolean(message.body) && source !== target;

  const [showOriginal, setShowOriginal] = useState(false);

  const translationQuery = useQuery({
    queryKey: ['translate', message.id, displayLocale],
    queryFn: () => messagingApi.translate(conversationId, message.id, displayLocale),
    enabled: needsTranslation,
    staleTime: Infinity,
    retry: false,
  });

  // What the bubble actually shows. Defaults to original; flips to the
  // translation as soon as it lands. The user can toggle back to original.
  const translatedText = translationQuery.data?.translatedText;
  const isShowingTranslation =
    needsTranslation && !showOriginal && translatedText && !translationQuery.data?.isOriginal;
  const displayText = isShowingTranslation ? translatedText : message.body;

  return (
    <Stack
      direction="row"
      justifyContent={mine ? 'flex-end' : 'flex-start'}
      sx={{ width: '100%' }}
    >
      <Stack spacing={0.25} alignItems={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '78%' }}>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            bgcolor: mine ? 'primary.main' : 'background.paper',
            color: mine ? 'primary.contrastText' : 'text.primary',
            border: mine ? 0 : 1,
            borderColor: 'divider',
            boxShadow: mine ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.18)}` : 'none',
          }}
        >
          {(message.attachmentUrls ?? []).length > 0 && (
            <Stack spacing={1} sx={{ mb: message.body ? 0.75 : 0 }}>
              {message.attachmentUrls.map((url, i) => (
                <Box
                  key={`${url}-${i}`}
                  component="img"
                  src={url}
                  alt="attachment"
                  sx={{ maxWidth: 260, borderRadius: 1.5, display: 'block' }}
                />
              ))}
            </Stack>
          )}
          {message.body && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {displayText}
            </Typography>
          )}

          {needsTranslation && translationQuery.isFetching && !translatedText && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75, opacity: 0.7 }}>
              <CircularProgress size={10} sx={{ color: 'inherit' }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>
                {t('messages.translating', 'Translating…')}
              </Typography>
            </Stack>
          )}

          {isShowingTranslation && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ mt: 0.75, opacity: 0.75 }}
            >
              <TranslateIcon sx={{ fontSize: 12 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>
                {translationQuery.data?.sourceLang
                  ? t('messages.translatedFrom', 'Translated from {{lang}}', {
                      lang: translationQuery.data.sourceLang.toUpperCase(),
                    })
                  : t('messages.translated', 'Translated')}
              </Typography>
              <Typography
                component="button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOriginal(true);
                }}
                variant="caption"
                sx={{
                  fontSize: 11,
                  background: 'none',
                  border: 0,
                  p: 0,
                  ml: 0.5,
                  cursor: 'pointer',
                  color: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                {t('messages.showOriginal', 'Show original')}
              </Typography>
            </Stack>
          )}

          {needsTranslation && showOriginal && translatedText && (
            <Typography
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginal(false);
              }}
              variant="caption"
              sx={{
                display: 'inline-block',
                fontSize: 11,
                mt: 0.5,
                background: 'none',
                border: 0,
                p: 0,
                cursor: 'pointer',
                color: 'inherit',
                textDecoration: 'underline',
                opacity: 0.75,
              }}
            >
              {t('messages.showTranslation', 'Show translation')}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {new Date(message.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
          </Typography>
          {mine && (
            seenByOther
              ? <DoneAllIcon sx={{ fontSize: 14, color: 'info.main' }} />
              : <DoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

function TypingDots() {
  return (
    <Stack direction="row" spacing={0.5} sx={{ pl: 1.5, py: 0.75 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            opacity: 0.6,
            animation: 'typingBounce 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.15}s`,
            '@keyframes typingBounce': {
              '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
              '30%': { transform: 'translateY(-4px)', opacity: 1 },
            },
          }}
        />
      ))}
    </Stack>
  );
}
