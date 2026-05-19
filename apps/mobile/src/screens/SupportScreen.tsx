import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api';
import { SHADOWS, SIZES } from '../theme';

type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface Ticket {
  id: string;
  ticketNumber: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  senderName?: string | null;
}

const CATEGORIES = [
  { value: 'general',   ar: 'عام',     en: 'General'   },
  { value: 'technical', ar: 'تقني',    en: 'Technical' },
  { value: 'billing',   ar: 'مدفوعات', en: 'Billing'   },
  { value: 'listing',   ar: 'إعلان',   en: 'Listing'   },
  { value: 'account',   ar: 'حساب',    en: 'Account'   },
  { value: 'other',     ar: 'أخرى',    en: 'Other'     },
] as const;

const STATUS_COLORS: Record<Status, string> = {
  open:        '#22C55E',
  in_progress: '#F59E0B',
  resolved:    '#6C63A6',
  closed:      '#9CA3AF',
};

// Mobile axios client doesn't unwrap the `{ data, timestamp }` envelope —
// every consumer here pulls .data.data manually.
function unwrapList<T>(payload: any): T[] {
  return (payload?.data?.data ?? payload?.data ?? payload ?? []) as T[];
}
function unwrapOne<T>(payload: any): T {
  return (payload?.data?.data ?? payload?.data ?? payload) as T;
}

export default function SupportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isAr, isRTL, textAlign, backIcon } = useRTL();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'general',
  });
  const [replyText, setReplyText] = useState('');

  // ----- Queries --------------------------------------------------------

  const ticketsQuery = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => api.get('/support/tickets').then((r) => unwrapList<Ticket>(r)),
    enabled: isAuthenticated,
  });
  const tickets: Ticket[] = ticketsQuery.data ?? [];

  const messagesQuery = useQuery({
    queryKey: ['support-messages', selectedTicket?.id],
    queryFn: () =>
      api
        .get(`/support/tickets/${selectedTicket?.id}/messages`)
        .then((r) => unwrapList<Message>(r)),
    enabled: !!selectedTicket,
    // Cheap polling while the detail screen is open — agents reply on web
    // and we want the user to see it without manually pulling to refresh.
    refetchInterval: selectedTicket ? 10_000 : false,
  });
  const messages: Message[] = messagesQuery.data ?? [];

  // ----- Mutations ------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/support/tickets', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      setForm({ subject: '', description: '', category: 'general' });
      setActiveTab('list');
      Alert.alert(
        isAr ? 'تم' : 'Success',
        isAr ? 'تم إنشاء تذكرة الدعم بنجاح' : 'Support ticket created successfully',
      );
    },
    onError: () => {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please try again',
      );
    },
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) =>
      api.post(`/support/tickets/${selectedTicket?.id}/messages`, { message }),
    onSuccess: () => {
      setReplyText('');
      void messagesQuery.refetch();
      void qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: () => {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'تعذّر إرسال الرد' : 'Could not send reply',
      );
    },
  });

  // ----- Handlers -------------------------------------------------------

  const handleCreate = () => {
    if (!form.subject.trim() || !form.description.trim()) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'يرجى تعبئة العنوان والوصف' : 'Please fill subject and description',
      );
      return;
    }
    createMutation.mutate({
      subject: form.subject.trim(),
      description: form.description.trim(),
      category: form.category,
    });
  };

  // ----- Labels ---------------------------------------------------------

  const statusLabel = (status: Status): string => {
    if (status === 'open')        return isAr ? 'مفتوح'         : 'Open';
    if (status === 'in_progress') return isAr ? 'قيد المعالجة' : 'In Progress';
    if (status === 'resolved')    return isAr ? 'محلول'         : 'Resolved';
    return isAr ? 'مغلق' : 'Closed';
  };

  const categoryLabel = (value: string): string => {
    const found = CATEGORIES.find((c) => c.value === value);
    if (!found) return value;
    return isAr ? found.ar : found.en;
  };

  // ----- Detail view ----------------------------------------------------

  if (selectedTicket) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity onPress={() => setSelectedTicket(null)}>
            <Ionicons name={backIcon as any} size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: SIZES.md }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedTicket.subject}
            </Text>
            {selectedTicket.ticketNumber ? (
              <Text style={styles.headerSub}>#{selectedTicket.ticketNumber}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[selectedTicket.status] + '40' },
            ]}
          >
            <Text style={[styles.statusText, { color: '#FFF' }]}>
              {statusLabel(selectedTicket.status)}
            </Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: SIZES.md, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={[styles.descBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.descLabel, { color: colors.textSecondary }]}>
                {isAr ? 'الوصف الأصلي:' : 'Original description:'}
              </Text>
              <Text style={[styles.descText, { color: colors.text, textAlign }]}>
                {selectedTicket.description}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const staff = item.isStaff;
            return (
              <View
                style={[styles.msgRow, { flexDirection: staff ? 'row' : 'row-reverse' }]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    {
                      backgroundColor: staff ? colors.surface : colors.primary,
                      borderWidth: staff ? 1 : 0,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {staff && (
                    <View style={styles.staffBadge}>
                      <Ionicons name="headset-outline" size={12} color={colors.primary} />
                      <Text style={[styles.staffBadgeText, { color: colors.primary }]}>
                        {isAr ? 'فريق الدعم' : 'Support Team'}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.msgText,
                      { color: staff ? colors.text : '#FFF', textAlign },
                    ]}
                  >
                    {item.message}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      { color: staff ? colors.textSecondary : 'rgba(255,255,255,0.7)' },
                    ]}
                  >
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            messagesQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : null
          }
        />

        {selectedTicket.status !== 'closed' && (
          <View
            style={[
              styles.replyBox,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <TextInput
              style={[
                styles.replyInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                  textAlign,
                },
              ]}
              value={replyText}
              onChangeText={setReplyText}
              placeholder={isAr ? 'اكتب ردك...' : 'Write your reply...'}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: replyText.trim()
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={() =>
                replyText.trim() && replyMutation.mutate(replyText.trim())
              }
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ----- List + form ----------------------------------------------------

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAr ? 'الدعم الفني' : 'Support'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[
          styles.tabs,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'list' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('list')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'list' ? colors.primary : colors.textSecondary,
              },
            ]}
          >
            {isAr ? 'تذاكري' : 'My Tickets'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'new' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('new')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'new' ? colors.primary : colors.textSecondary,
              },
            ]}
          >
            {isAr ? 'تذكرة جديدة' : 'New Ticket'}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' ? (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshing={ticketsQuery.isFetching}
          onRefresh={() => void ticketsQuery.refetch()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.ticketCard, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedTicket(item)}
            >
              <View
                style={[
                  styles.ticketHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={[styles.ticketNumber, { color: colors.textSecondary }]}>
                  {item.ticketNumber ? `#${item.ticketNumber}` : ''}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[item.status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.ticketSubject, { color: colors.text, textAlign }]}>
                {item.subject}
              </Text>
              <View
                style={[
                  styles.ticketMeta,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={[styles.categoryChip, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.categoryText, { color: colors.primary }]}>
                    {categoryLabel(item.category)}
                  </Text>
                </View>
                <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            ticketsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="headset-outline" size={64} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {isAr ? 'لا توجد تذاكر دعم' : 'No support tickets'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {isAr
                    ? 'أنشئ تذكرة جديدة للحصول على المساعدة'
                    : 'Create a new ticket to get help'}
                </Text>
                <TouchableOpacity
                  style={[styles.newTicketBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab('new')}
                >
                  <Text style={styles.newTicketBtnText}>
                    {isAr ? 'إنشاء تذكرة' : 'Create Ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'الفئة' : 'Category'}
          </Text>
          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {CATEGORIES.map((cat) => {
              const active = form.category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                    active && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, category: cat.value }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {isAr ? cat.ar : cat.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'الموضوع *' : 'Subject *'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                textAlign,
              },
            ]}
            value={form.subject}
            onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
            placeholder={isAr ? 'موضوع المشكلة أو الاستفسار' : 'Issue or inquiry subject'}
            placeholderTextColor={colors.textSecondary}
            maxLength={200}
          />

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'الوصف التفصيلي *' : 'Detailed Description *'}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                textAlign,
              },
            ]}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder={isAr ? 'اشرح مشكلتك بالتفصيل...' : 'Describe your issue in detail...'}
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SIZES.sm,
                }}
              >
                <Ionicons name="send-outline" size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>
                  {isAr ? 'إرسال التذكرة' : 'Submit Ticket'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: SIZES.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.lg,
  },
  headerTitle: {
    fontSize: SIZES.title,
    fontWeight: '800',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: SIZES.small,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 2,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: SIZES.md, alignItems: 'center' },
  tabText: { fontSize: SIZES.body, fontWeight: '700' },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  ticketCard: {
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  ticketHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  ticketNumber: { fontSize: SIZES.small, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: {
    fontSize: SIZES.bodyLg,
    fontWeight: '700',
    marginBottom: SIZES.sm,
  },
  ticketMeta: { alignItems: 'center', justifyContent: 'space-between' },
  categoryChip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  categoryText: { fontSize: 11, fontWeight: '600' },
  ticketDate: { fontSize: SIZES.small },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: '700',
    marginTop: SIZES.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: SIZES.body,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
  newTicketBtn: {
    marginTop: SIZES.xl,
    paddingHorizontal: SIZES.xxxl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
  },
  newTicketBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: SIZES.bodyLg,
  },
  formContainer: { padding: SIZES.xl },
  fieldLabel: { fontSize: SIZES.body, fontWeight: '700', marginBottom: SIZES.sm },
  chipsRow: { flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.lg },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1.5,
  },
  chipText: { fontSize: SIZES.small, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.md,
    fontSize: SIZES.body,
    marginBottom: SIZES.lg,
    height: 52,
  },
  textarea: { height: 140, textAlignVertical: 'top' },
  submitBtn: {
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: SIZES.bodyLg },
  descBox: {
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  descLabel: { fontSize: SIZES.small, fontWeight: '600', marginBottom: SIZES.sm },
  descText: { fontSize: SIZES.body, lineHeight: 22 },
  msgRow: { marginBottom: SIZES.md },
  msgBubble: {
    maxWidth: '80%',
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SIZES.sm,
  },
  staffBadgeText: { fontSize: 11, fontWeight: '700' },
  msgText: { fontSize: SIZES.body, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4 },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SIZES.md,
    borderTopWidth: 1,
    gap: SIZES.sm,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.md,
    fontSize: SIZES.body,
    maxHeight: 100,
    minHeight: 48,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
