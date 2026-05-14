import React from 'react';
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { savedApi } from '../api';
import { SIZES, TYPOGRAPHY } from '../theme';
import ListingCard from '../components/ListingCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SavedScreen({ navigation }: any) {
  const { colors } = useTheme();
  useRTL();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['saved-listings'],
    queryFn: () => savedApi.list(),
    enabled: isAuthenticated,
  });

  const items: any[] =
    data?.data?.data ||
    data?.data ||
    data ||
    [];
  const listings: any[] = Array.isArray(items) ? items : [];

  const unsave = useMutation({
    mutationFn: (id: string) => savedApi.unsave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-listings'] });
    },
  });

  const confirmRemove = (item: any) => {
    Alert.alert(
      t('saved.removeTitle'),
      t('saved.removePrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('saved.removeTitle'),
          style: 'destructive',
          onPress: () => unsave.mutate(item.id),
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ backgroundColor: colors.primary, padding: SIZES.lg }}>
          <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>
            {t('saved.title')}
          </Text>
        </View>
        <EmptyState
          icon="heart-outline"
          title={t('saved.signInPrompt')}
          actionLabel={t('auth.loginBtn')}
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ backgroundColor: colors.primary, padding: SIZES.lg }}>
        <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>
          {t('saved.title')}
        </Text>
      </View>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: SIZES.md, gap: SIZES.sm, paddingBottom: SIZES.xxxl }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }: any) => (
            <View>
              <ListingCard
                item={item}
                variant="list"
                onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: SIZES.sm,
                  right: SIZES.sm,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => confirmRemove(item)}
              >
                <Ionicons name="heart" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('saved.empty')}
              subtitle={t('saved.emptyPrompt')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
