import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

type PromoType = 'percentage' | 'fixed_amount' | 'free_nights';

export default function AdminPromosScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon, textAlign } = useRTL();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoType>('percentage');
  const [discount, setDiscount] = useState('');

  // Promos listing is mounted at GET /promos — the controller filters by
  // viewer role server-side, so an admin sees every code while agents/buyers
  // only see codes they can use.
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-promos'],
    queryFn: () => api.get('/promos').then(r => r.data),
  });

  const promos: any[] = data?.data?.data ?? data?.data ?? data?.items ?? [];

  const createPromo = useMutation({
    mutationFn: (payload: any) => api.post('/promos', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promos'] });
      setShowCreate(false);
      setCode('');
      setDiscount('');
      setType('percentage');
    },
    onError: () => Alert.alert(t('common.error'), t('common.errorOccurred')),
  });

  const deletePromo = useMutation({
    mutationFn: (id: string) => api.delete(`/promos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
    onError: () => Alert.alert(t('common.error'), t('common.errorOccurred')),
  });

  const confirmDelete = (id: string) => {
    Alert.alert(t('common.delete'), t('promo.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePromo.mutate(id) },
    ]);
  };

  const submitCreate = () => {
    const value = Number(discount);
    if (!code.trim() || !value || isNaN(value)) {
      Alert.alert(t('common.error'), t('auth.fillRequired'));
      return;
    }
    createPromo.mutate({
      code: code.trim().toUpperCase(),
      type,
      discountValue: value,
      isActive: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.promos')}</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={promos}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: colors.primary, textAlign }]}>{item.code}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]}>
                  {t(`promo.type.${item.type}`)} · {Number(item.discountValue ?? 0)}
                  {item.type === 'percentage' ? '%' : ` ${t('common.sar')}`}
                </Text>
                <Text style={[styles.meta, { color: colors.textLight, textAlign }]}>
                  {item.usesCount ?? 0}{item.maxUses ? `/${item.maxUses}` : ''} {t('promo.uses')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: SIZES.sm }}>
                <View style={[styles.activePill, {
                  backgroundColor: item.isActive ? '#22C55E20' : '#9CA3AF20',
                }]}>
                  <Text style={[styles.activeText, {
                    color: item.isActive ? '#22C55E' : '#9CA3AF',
                  }]}>
                    {item.isActive ? t('promo.active') : t('common.inactive')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={64} color={colors.border} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.md }]}>
                {t('promo.empty')}
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <ScrollView>
              <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginBottom: SIZES.md }]}>
                {t('promo.createNew')}
              </Text>

              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('promo.code')}
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                style={[styles.input, {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }]}
                placeholderTextColor={colors.textSecondary}
                placeholder="SUMMER20"
              />

              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('search.type')}
              </Text>
              <View style={[styles.typeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(['percentage', 'fixed_amount', 'free_nights'] as PromoType[]).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.typeChip, {
                      backgroundColor: type === opt ? colors.primary : colors.surface,
                      borderColor: type === opt ? colors.primary : colors.border,
                    }]}
                    onPress={() => setType(opt)}
                  >
                    <Text style={[styles.typeChipText, { color: type === opt ? '#FFF' : colors.text }]}>
                      {t(`promo.type.${opt}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('promo.value')}
              </Text>
              <TextInput
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                style={[styles.input, {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }]}
                placeholderTextColor={colors.textSecondary}
                placeholder={type === 'percentage' ? '10' : type === 'free_nights' ? '1' : '50'}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancel, { borderColor: colors.border }]}
                  onPress={() => setShowCreate(false)}
                >
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmit, {
                    backgroundColor: colors.primary,
                    opacity: createPromo.isPending ? 0.5 : 1,
                  }]}
                  disabled={createPromo.isPending}
                  onPress={submitCreate}
                >
                  <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{t('common.create')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  cardRow: { alignItems: 'flex-start', justifyContent: 'space-between' },
  code: { fontSize: SIZES.bodyLg, fontFamily: 'Tajawal_800ExtraBold', letterSpacing: 1 },
  meta: { fontSize: SIZES.small, marginTop: 4, fontFamily: 'Tajawal_400Regular' },
  activePill: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  activeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SIZES.lg },
  modalCard: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, maxHeight: '85%' },
  input: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.md, fontFamily: 'Tajawal_400Regular' },
  typeRow: { gap: SIZES.sm, marginBottom: SIZES.md, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  typeChipText: { fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold' },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.sm },
  modalCancel: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, borderWidth: 1, alignItems: 'center' },
  modalSubmit: { flex: 1, padding: SIZES.md, borderRadius: SIZES.borderRadius, alignItems: 'center' },
});
