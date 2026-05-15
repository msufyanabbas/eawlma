import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

type Resolution = 'favor_agent' | 'favor_buyer' | 'cancel_deal';

export default function AdminDisputesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon, textAlign } = useRTL();
  const qc = useQueryClient();
  const [resolveFor, setResolveFor] = useState<any>(null);
  const [resolution, setResolution] = useState<Resolution>('favor_agent');
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => api.get('/inquiries/admin/disputes').then(r => r.data),
  });

  const disputes: any[] = data?.data?.data ?? data?.data ?? data?.items ?? [];

  const resolve = useMutation({
    mutationFn: ({ id, resolution, notes }: { id: string; resolution: Resolution; notes: string }) =>
      api.post(`/inquiries/${id}/admin-resolve`, { resolution, adminNotes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
      setResolveFor(null);
      setNotes('');
    },
    onError: () => Alert.alert(t('common.error'), t('adminDisputes.resolvedError')),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.disputes')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={disputes}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="warning" size={18} color="#EF4444" />
              <Text style={[styles.title, { color: colors.text, flex: 1, marginHorizontal: SIZES.sm, textAlign }]}>
                {Number(item.closedDealValue ?? item.transactionValue ?? 0).toLocaleString()} {t('common.sar')}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.badgeText, { color: '#EF4444' }]}>
                  {t('adminDisputes.title')}
                </Text>
              </View>
            </View>
            {item.disputeReason && (
              <Text style={[styles.reason, { color: colors.textSecondary, textAlign }]} numberOfLines={3}>
                {item.disputeReason}
              </Text>
            )}
            {item.disputedAt && (
              <Text style={[styles.date, { color: colors.textLight, textAlign }]}>
                {new Date(item.disputedAt).toLocaleDateString()}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.resolveBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setResolveFor(item); setResolution('favor_agent'); }}
            >
              <Text style={styles.resolveBtnText}>{t('adminDisputes.resolveTitle')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={64} color={colors.border} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.md }]}>
                {t('adminDisputes.empty')}
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={!!resolveFor}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveFor(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginBottom: SIZES.sm }]}>
              {t('adminDisputes.resolveTitle')}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginBottom: SIZES.md }]}>
              {t('adminDisputes.resolveDesc')}
            </Text>
            {([
              { key: 'favor_agent', label: t('adminDisputes.favorAgent'), desc: t('adminDisputes.favorAgentDesc') },
              { key: 'favor_buyer', label: t('adminDisputes.favorBuyer'), desc: t('adminDisputes.favorBuyerDesc') },
              { key: 'cancel_deal', label: t('adminDisputes.cancelDeal'), desc: t('adminDisputes.cancelDealDesc') },
            ] as { key: Resolution; label: string; desc: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionRow, {
                  borderColor: resolution === opt.key ? colors.primary : colors.border,
                  backgroundColor: resolution === opt.key ? colors.primary + '10' : 'transparent',
                }]}
                onPress={() => setResolution(opt.key)}
              >
                <View style={[styles.radio, { borderColor: resolution === opt.key ? colors.primary : colors.border }]}>
                  {resolution === opt.key && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1, marginHorizontal: SIZES.sm }}>
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>{opt.label}</Text>
                  <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, textAlign }]}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              style={[styles.notesInput, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              }]}
              placeholderTextColor={colors.textSecondary}
              placeholder={t('adminDisputes.adminNotes')}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => { setResolveFor(null); setNotes(''); }}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: colors.primary, opacity: resolve.isPending ? 0.5 : 1 }]}
                disabled={resolve.isPending}
                onPress={() => resolveFor && resolve.mutate({ id: resolveFor.id, resolution, notes: notes.trim() })}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.title, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  card: { padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  cardHeader: { alignItems: 'center' },
  title: { fontSize: SIZES.bodyLg, fontFamily: 'Tajawal_800ExtraBold' },
  badge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  badgeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  reason: { fontSize: SIZES.small, marginTop: SIZES.sm, fontFamily: 'Tajawal_400Regular' },
  date: { fontSize: SIZES.small, marginTop: 4, fontFamily: 'Tajawal_400Regular' },
  resolveBtn: { marginTop: SIZES.sm, padding: SIZES.sm, borderRadius: SIZES.borderRadius, alignItems: 'center' },
  resolveBtnText: { color: '#FFF', fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SIZES.lg },
  modalCard: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, borderRadius: SIZES.borderRadius, borderWidth: 1, marginBottom: SIZES.sm },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  notesInput: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, minHeight: 60, textAlignVertical: 'top', marginTop: SIZES.sm, fontFamily: 'Tajawal_400Regular' },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  modalCancel: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, borderWidth: 1, alignItems: 'center' },
  modalSubmit: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, alignItems: 'center' },
});
