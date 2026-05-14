import React from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { reviewsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import UserAvatar from '../components/UserAvatar';

type Mode = 'listing' | 'agent';

export default function ReviewsScreen({ navigation, route }: any) {
  const { mode, id } = (route.params || {}) as { mode: Mode; id: string };
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reviews', mode, id],
    queryFn: () =>
      mode === 'agent' ? reviewsApi.listForAgent(id) : reviewsApi.listForListing(id),
    enabled: !!id,
  });

  const items: any[] =
    data?.data?.data || data?.data || data?.items || (Array.isArray(data) ? data : []);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={isAr ? 'التقييمات' : 'Reviews'}
        onBack={() => navigation.goBack()}
      />
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
            const reviewer = item.reviewer || item.author || item.user || {};
            const name = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || (isAr ? 'مستخدم' : 'User');
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <UserAvatar user={reviewer} size={40} />
                  <View style={{ flex: 1, marginHorizontal: SIZES.md }}>
                    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.warning, marginTop: 2, textAlign }]}>
                      {renderStars(Math.round(Number(item.rating || 0)))}
                    </Text>
                  </View>
                  {item.createdAt && (
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textLight }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {item.comment && (
                  <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.sm, textAlign }]}>
                    {item.comment}
                  </Text>
                )}
                {item.reply && (
                  <View style={[styles.reply, { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary }]}>
                    <Text style={[TYPOGRAPHY.small, { color: colors.primary, fontWeight: '700', textAlign }]}>
                      {isAr ? 'رد المالك:' : 'Owner reply:'}
                    </Text>
                    <Text style={[TYPOGRAPHY.body, { color: colors.text, marginTop: 4, textAlign }]}>
                      {item.reply}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title={isAr ? 'لا توجد تقييمات' : 'No reviews yet'}
              subtitle={isAr ? 'كن أول من يقيّم' : 'Be the first to review'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  header: { alignItems: 'center' },
  reply: { marginTop: SIZES.md, padding: SIZES.md, borderRadius: SIZES.borderRadius, borderLeftWidth: 3 },
});
