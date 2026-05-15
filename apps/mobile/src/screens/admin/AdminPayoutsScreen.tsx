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

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  paid: '#22C55E',
  failed: '#EF4444',
  rejected: '#EF4444',
};

export default function AdminPayoutsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon, textAlign } = useRTL();
  const qc = useQueryClient();
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => api.get('/payouts/admin').then(r => r.data),
  });

  const payouts: any[] = data?.data?.data ?? data?.data ?? data?.items ?? [];

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/payouts/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
      setRejectFor(null);
      setReason('');
    },
    onError: () => Alert.alert(t('common.error'), t('common.errorOccurred')),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.payouts')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={payouts}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => {
          const status = (item.status || 'pending').toLowerCase();
          const color = STATUS_COLORS[status] || colors.primary;
          const isPending = status === 'pending' || status === 'processing';
          return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.amount, { color: colors.text }]}>
                  {Number(item.amount ?? 0).toLocaleString()} {t('common.sar')}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {t(`wallet.payoutStatus.${status}`)}
                  </Text>
                </View>
              </View>
              {item.iban && (
                <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]} numberOfLines={1}>
                  IBAN: {item.iban}
                </Text>
              )}
              {item.beneficiaryName && (
                <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]} numberOfLines={1}>
                  {t('wallet.beneficiaryName')}: {item.beneficiaryName}
                </Text>
              )}
              {item.createdAt && (
                <Text style={[styles.meta, { color: colors.textLight, textAlign }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
              {isPending && (
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => setRejectFor(item.id)}
                >
                  <Ionicons name="close" size={14} color="#FFF" />
                  <Text style={styles.rejectBtnText}>{t('admin.reject')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={64} color={colors.border} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.md }]}>
                {t('admin.noPayouts')}
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
              {t('admin.rejectPayout')}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginBottom: SIZES.md }]}>
              {t('admin.rejectPayoutBody')}
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
  card: { padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  cardRow: { alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: SIZES.bodyLg, fontFamily: 'Tajawal_800ExtraBold' },
  statusPill: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  meta: { fontSize: SIZES.small, marginTop: 4, fontFamily: 'Tajawal_400Regular' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.borderRadius, marginTop: SIZES.sm, gap: 4, alignSelf: 'flex-start' },
  rejectBtnText: { color: '#FFF', fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SIZES.lg },
  modalCard: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg },
  reasonInput: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Tajawal_400Regular' },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  modalCancel: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, borderWidth: 1, alignItems: 'center' },
  modalSubmit: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, alignItems: 'center' },
});
