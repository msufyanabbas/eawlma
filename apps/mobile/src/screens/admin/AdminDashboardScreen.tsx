import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import { SIZES, SHADOWS } from '../../theme';

interface AdminStats {
  totalUsers?: number;
  totalAgents?: number;
  totalListings?: number;
  activeListings?: number;
  totalInquiries?: number;
  totalBookings?: number;
  totalRevenue?: number;
  pendingModeration?: number;
  openDisputes?: number;
  platformEarnings?: number;
  newUsersThisMonth?: number;
}

export default function AdminDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon } = useRTL();

  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });

  // Tolerate both envelope shapes the backend interceptor might emit.
  const stats: AdminStats = data?.data ?? data ?? {};

  const kpis: { key: keyof AdminStats; icon: string; color: string; label: string }[] = [
    { key: 'totalUsers',       icon: 'people-outline',   color: '#6C63A6', label: t('admin.totalUsers') },
    { key: 'activeListings',   icon: 'home-outline',     color: '#22C55E', label: t('admin.totalListings') },
    { key: 'pendingModeration', icon: 'time-outline',    color: '#F59E0B', label: t('admin.pendingReview') },
    { key: 'totalBookings',    icon: 'calendar-outline', color: '#3B82F6', label: t('admin.totalBookings') },
    { key: 'platformEarnings', icon: 'cash-outline',     color: '#D4A843', label: t('admin.revenue') },
    { key: 'openDisputes',     icon: 'warning-outline',  color: '#EF4444', label: t('admin.disputes') },
  ];

  const adminMenus = [
    { icon: 'list-outline',     label: t('admin.moderation'),  screen: 'AdminModeration' },
    { icon: 'people-outline',   label: t('admin.users'),       screen: 'AdminUsers' },
    { icon: 'receipt-outline',  label: t('admin.commissions'), screen: 'AdminCommissions' },
    { icon: 'wallet-outline',   label: t('admin.payouts'),     screen: 'AdminPayouts' },
    { icon: 'warning-outline',  label: t('admin.disputes'),    screen: 'AdminDisputes' },
    { icon: 'pricetag-outline', label: t('admin.promos'),      screen: 'AdminPromos' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.dashboard')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.kpiGrid}>
          {kpis.map(kpi => {
            const raw = stats[kpi.key];
            const value = typeof raw === 'number' ? raw.toLocaleString() : '0';
            return (
              <View
                key={String(kpi.key)}
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.surface, borderLeftColor: kpi.color, borderLeftWidth: 4 },
                ]}
              >
                <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '20' }]}>
                  <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('admin.management')}
          </Text>
          {adminMenus.map(item => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuRow, {
                backgroundColor: colors.surface,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text, marginHorizontal: SIZES.md, flex: 1 }]}>
                {item.label}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SIZES.lg, alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: SIZES.h3, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SIZES.md, gap: SIZES.sm },
  kpiCard: { width: '47%', padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  kpiIcon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.sm },
  kpiValue: { fontSize: SIZES.h3, fontFamily: 'Tajawal_800ExtraBold' },
  kpiLabel: { fontSize: SIZES.small, marginTop: 2, fontFamily: 'Tajawal_400Regular' },
  menuSection: { margin: SIZES.lg },
  sectionTitle: { fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SIZES.sm },
  menuRow: { alignItems: 'center', padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  menuIcon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: SIZES.bodyLg, fontFamily: 'Tajawal_700Bold' },
});
