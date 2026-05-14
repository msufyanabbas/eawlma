import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { bookingsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const STATUS_COLOURS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#22C55E',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  expired: '#6B7280',
};

export default function BookingsListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isRTL, textAlign } = useRTL();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAgent = user?.role === 'agent' || user?.role === 'agency_owner';
  const [tab, setTab] = useState<'guest' | 'host'>(isAgent ? 'host' : 'guest');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () =>
      tab === 'host' ? bookingsApi.hostBookings() : bookingsApi.myBookings(),
  });

  const items: any[] =
    data?.data?.data || data?.data || (Array.isArray(data) ? data : []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('bookings.title')} onBack={() => navigation.goBack()} />

      {isAgent && (
        <View style={[
          styles.tabs,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}>
          <TabBtn
            label={t('bookings.guest')}
            active={tab === 'guest'}
            onPress={() => setTab('guest')}
            colors={colors}
          />
          <TabBtn
            label={t('bookings.host')}
            active={tab === 'host'}
            onPress={() => setTab('host')}
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
            const statusColor = STATUS_COLOURS[item.status] || colors.textSecondary;
            const nights =
              item.checkIn && item.checkOut
                ? Math.max(
                    0,
                    Math.round(
                      (new Date(item.checkOut).getTime() -
                        new Date(item.checkIn).getTime()) /
                        86400000,
                    ),
                  )
                : null;
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() =>
                  item.listingId &&
                  navigation.navigate('ListingDetail', { id: item.listingId })
                }
              >
                <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, marginHorizontal: SIZES.sm, textAlign }]} numberOfLines={1}>
                    {item.listingTitle || item.listing?.titleAr || item.listing?.titleEn ||
                      t('booking.bookNow')}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[TYPOGRAPHY.caption, { color: statusColor, fontWeight: '800' }]}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.sm, textAlign }]}>
                  {item.checkIn?.slice(0, 10)} → {item.checkOut?.slice(0, 10)}
                  {nights != null ? `  ·  ${nights} ${t('booking.nights')}` : ''}
                </Text>

                {item.totalAmount != null && (
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary, marginTop: SIZES.xs, textAlign }]}>
                    {Number(item.totalAmount).toLocaleString()} {t('common.sar')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={t('bookings.noBookings')}
              subtitle={t('bookings.noBookingsHint')}
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
  row: { alignItems: 'center' },
  badge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
});
