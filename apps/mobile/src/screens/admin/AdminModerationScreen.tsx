import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import SmartImage from '../../components/SmartImage';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

export default function AdminModerationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon } = useRTL();
  const qc = useQueryClient();
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => api.get('/admin/listings/pending').then(r => r.data),
  });

  const listings: any[] = data?.data?.data ?? data?.data ?? data?.items ?? [];

  // Backend mounts approve/reject as POST under /admin/listings/:id (see
  // admin-listings.controller.ts). We mirror that exactly.
  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/listings/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pending'] }); },
    onError: () => Alert.alert(t('common.error'), t('moderation.actionFailed')),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/listings/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] });
      setRejectFor(null);
      setReason('');
    },
    onError: () => Alert.alert(t('common.error'), t('moderation.actionFailed')),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.moderation')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <SmartImage uri={item.coverImageUrl || item.media?.[0]?.url} style={styles.image} />
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.titleAr || item.titleEn || item.title}
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                {Number(item.price ?? 0).toLocaleString()} {t('common.sar')}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {(item.city || '—')} · {(item.propertyType || '')}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.approveBtn, { backgroundColor: '#22C55E' }]}
                  onPress={() => approve.mutate(item.id)}
                  disabled={approve.isPending}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>{t('admin.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => setRejectFor(item.id)}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>{t('admin.reject')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('admin.allClear')}
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={!!rejectFor}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectFor(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginBottom: SIZES.sm }]}>
              {t('admin.rejectListing')}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginBottom: SIZES.md }]}>
              {t('admin.rejectReason')}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              style={[styles.reasonInput, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              }]}
              placeholderTextColor={colors.textSecondary}
              placeholder={t('admin.rejectReason')}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => { setRejectFor(null); setReason(''); }}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#EF4444', opacity: !reason.trim() ? 0.5 : 1 }]}
                disabled={!reason.trim() || reject.isPending}
                onPress={() => rejectFor && reject.mutate({ id: rejectFor, reason: reason.trim() })}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{t('admin.reject')}</Text>
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
  card: { flexDirection: 'row', borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, overflow: 'hidden', ...SHADOWS.sm },
  image: { width: 100, height: 100 },
  info: { flex: 1, padding: SIZES.sm },
  title: { fontSize: SIZES.body, fontFamily: 'Tajawal_700Bold' },
  price: { fontSize: SIZES.body, fontFamily: 'Tajawal_800ExtraBold', marginTop: 2 },
  meta: { fontSize: SIZES.small, marginTop: 2, fontFamily: 'Tajawal_400Regular' },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SIZES.sm, borderRadius: SIZES.borderRadius, gap: 4 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SIZES.sm, borderRadius: SIZES.borderRadius, gap: 4 },
  actionBtnText: { color: '#FFF', fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: SIZES.body, marginTop: SIZES.md, fontFamily: 'Tajawal_400Regular' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SIZES.lg },
  modalCard: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg },
  reasonInput: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Tajawal_400Regular' },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  modalCancel: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, borderWidth: 1, alignItems: 'center' },
  modalSubmit: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, alignItems: 'center' },
});
