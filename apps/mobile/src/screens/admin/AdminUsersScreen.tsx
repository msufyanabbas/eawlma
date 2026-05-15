import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { api } from '../../api';
import UserAvatar from '../../components/UserAvatar';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

const ROLES = ['all', 'user', 'agent', 'admin'];

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444',
  agent: '#6C63A6',
  agency_owner: '#D4A843',
  user: '#22C55E',
};

export default function AdminUsersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRTL, backIcon, textAlign } = useRTL();
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', role],
    queryFn: () =>
      api.get('/admin/users', {
        params: { role: role === 'all' ? undefined : role, limit: 50 },
      }).then(r => r.data),
  });

  const all: any[] = data?.data?.data ?? data?.data ?? [];
  const users = all.filter((u: any) =>
    !search ||
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.users')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchBar, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, textAlign }]}
          placeholder={t('common.search')}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={[styles.roleFilter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {ROLES.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.roleChip, {
              backgroundColor: role === r ? colors.primary : colors.surface,
              borderColor: colors.border,
            }]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleChipText, { color: role === r ? '#FFF' : colors.text }]}>
              {r === 'all' ? t('search.all') : t(`roles.${r}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }: any) => (
          <View style={[styles.userRow, {
            backgroundColor: colors.surface,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }]}>
            <UserAvatar user={item} size={44} />
            <View style={[styles.userInfo, { marginHorizontal: SIZES.md }]}>
              <Text style={[styles.userName, { color: colors.text, textAlign }]}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary, textAlign }]} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <View style={[styles.roleBadge, {
              backgroundColor: (ROLE_COLORS[item.role] || colors.primary) + '20',
            }]}>
              <Text style={[styles.roleBadgeText, {
                color: ROLE_COLORS[item.role] || colors.primary,
              }]}>
                {item.role}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color={colors.border} />
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.md }]}>
                {t('search.noResults')}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.title, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  searchBar: { alignItems: 'center', margin: SIZES.md, padding: SIZES.md, borderRadius: SIZES.borderRadiusFull, borderWidth: 1, gap: SIZES.sm },
  searchInput: { flex: 1, fontSize: SIZES.body, fontFamily: 'Tajawal_400Regular' },
  roleFilter: { paddingHorizontal: SIZES.md, gap: SIZES.sm, marginBottom: SIZES.sm },
  roleChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  roleChipText: { fontSize: SIZES.small, fontFamily: 'Tajawal_700Bold' },
  userRow: { alignItems: 'center', padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  userInfo: { flex: 1 },
  userName: { fontSize: SIZES.body, fontFamily: 'Tajawal_700Bold' },
  userEmail: { fontSize: SIZES.small, marginTop: 2, fontFamily: 'Tajawal_400Regular' },
  roleBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  roleBadgeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  empty: { alignItems: 'center', paddingVertical: 60 },
});
