import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { inquiriesApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const STATUS_COLORS: Record<string, string> = {
  open: '#22C55E',
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  closed: '#6B7280',
  disputed: '#EF4444',
};

export default function InquiriesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { user } = useAuthStore();
  const isAgent = user?.role === 'agent' || user?.role === 'agency_owner';
  const [tab, setTab] = useState<'received' | 'sent'>(isAgent ? 'received' : 'sent');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-inquiries', tab],
    queryFn: () =>
      tab === 'received'
        ? inquiriesApi.getMineAsAgent()
        : inquiriesApi.getMineSent(),
  });

  const items: any[] = data?.data?.data || data?.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={isAr ? 'الاستفسارات' : 'Inquiries'}
        onBack={() => navigation.goBack()}
      />

      {isAgent && (
        <View style={[
          styles.tabs,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}>
          <TabBtn
            label={isAr ? 'مستلمة' : 'Received'}
            active={tab === 'received'}
            onPress={() => setTab('received')}
            colors={colors}
          />
          <TabBtn
            label={isAr ? 'مرسلة' : 'Sent'}
            active={tab === 'sent'}
            onPress={() => setTab('sent')}
            colors={colors}
          />
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }: any) => {
            const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
            const title =
              (isAr && item.listing?.titleAr) ||
              item.listing?.titleEn ||
              item.listing?.titleAr ||
              (isAr ? 'استفسار' : 'Inquiry');
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() =>
                  item.listingId &&
                  navigation.navigate('ListingDetail', { id: item.listingId })
                }
              >
                <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, textAlign }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[TYPOGRAPHY.caption, { color: statusColor, fontWeight: '800' }]}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {item.message && (
                  <Text
                    style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.xs, textAlign }]}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>
                )}
                {item.createdAt && (
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textLight, marginTop: SIZES.sm, textAlign }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="mail-outline"
              title={isAr ? 'لا توجد استفسارات' : 'No inquiries yet'}
              subtitle={isAr
                ? 'سيظهر سجل الاستفسارات هنا'
                : 'Your inquiries will appear here'}
            />
          }
        />
      )}
    </View>
  );
}

function TabBtn({ label, active, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.tabBtn,
        active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
      ]}
      onPress={onPress}
    >
      <Text style={[
        TYPOGRAPHY.bodyBold,
        { color: active ? colors.primary : colors.textSecondary },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabs: { borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: SIZES.md, alignItems: 'center' },
  card: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  cardHeader: { alignItems: 'center', gap: SIZES.sm },
  badge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
});
