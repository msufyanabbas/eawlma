import React from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function HotelsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { textAlign } = useRTL();
  const { t } = useTranslation();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => listingsApi.search({
      propertyTypes: 'hotel_room',
      rentalType: 'hotel',
      limit: 30,
    }),
  });

  const listings: any[] =
    data?.data?.data || data?.data?.items || data?.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('hotels.title')} onBack={() => navigation.goBack()} />
      <View style={{ padding: SIZES.lg, backgroundColor: colors.primary }}>
        <Text style={[TYPOGRAPHY.h3, { color: '#FFF', textAlign }]}>
          {t('hotels.bookStay')}
        </Text>
        <Text style={[TYPOGRAPHY.body, { color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign }]}>
          {t('hotels.nightly')}
        </Text>
      </View>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {listings.length === 0 ? (
            <EmptyState
              icon="bed-outline"
              title={t('hotels.noHotels')}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm }}>
              {listings.map(item => (
                <ListingCard
                  key={item.id}
                  item={item}
                  variant="grid"
                  onPress={() =>
                    navigation.navigate('Booking', { listingId: item.id, listing: item })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
