import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

const STATUS_COLORS: Record<string, string> = {
  paid: COLORS.success,
  pending: COLORS.warning,
  cancelled: COLORS.error,
};

export default function CommissionsScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => api.get('/commissions').then(r => r.data),
  });

  const items = data?.data?.data || data?.data || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons
            name={isAr ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAr ? 'العمولات' : 'Commissions'}</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {isAr ? 'لا توجد عمولات' : 'No commissions yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title || `#${item.id?.slice(0, 8)}`}
                </Text>
                <View style={[
                  styles.badge,
                  { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textSecondary) + '20' },
                ]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || COLORS.textSecondary }]}>
                    {item.status || 'pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.amount}>
                {Number(item.amount || 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
              </Text>
              {item.createdAt && (
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: SIZES.lg },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: '#FFF' },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  card: { backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  badge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  amount: { fontSize: SIZES.title, fontWeight: '900', color: COLORS.primary, marginTop: SIZES.sm },
  date: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  emptyText: { fontSize: SIZES.subtitle, fontWeight: '700', color: COLORS.text, marginTop: SIZES.lg, textAlign: 'center' },
});
