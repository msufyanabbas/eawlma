// SavedScreen — wishlists tab. Reads from the user's default wishlist via
// `/wishlists/default/listings`. Heart tap on a listing card removes it from
// the wishlist optimistically. Anonymous users see a sign-in CTA because
// wishlists are server-side only — no local fallback to keep favourites in
// sync across devices.
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';

import { BrandSpinner } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { ListingCard } from '@/components/ListingCard';
import { apiClient, extractErrorMessage, type Listing } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { FONTS, SIZES, useColors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

interface WishlistResponse {
  data: Listing[];
}

async function fetchWishlist(): Promise<Listing[]> {
  const { data } = await apiClient.get<WishlistResponse>('/wishlists/default/listings');
  return data?.data ?? [];
}

export function SavedScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ['wishlist', 'default'],
    queryFn: fetchWishlist,
    enabled: !!token,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiClient.delete(`/wishlists/default/listings/${listingId}`);
      return listingId;
    },
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist', 'default'] });
      const previous = queryClient.getQueryData<Listing[]>(['wishlist', 'default']);
      queryClient.setQueryData<Listing[]>(['wishlist', 'default'], (old = []) =>
        old.filter((l) => l.id !== listingId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['wishlist', 'default'], ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist', 'default'] });
    },
  });

  if (!token) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('nav.favorites')}</Text>
        </View>
        <View style={styles.centerWrap}>
          <EmptyState
            icon="heart-outline"
            title={t('wishlist.signInToSync')}
            body={t('wishlist.signInDesc')}
            ctaLabel={t('auth.signIn')}
            onCta={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    );
  }

  const listings = wishlistQuery.data ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('nav.favorites')}</Text>
        {listings.length > 0 ? (
          <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
            {listings.length}
          </Text>
        ) : null}
      </View>

      {wishlistQuery.isLoading ? (
        <View style={styles.centerWrap}>
          <BrandSpinner />
        </View>
      ) : wishlistQuery.isError ? (
        <View style={styles.centerWrap}>
          <Text style={[styles.error, { color: colors.error }]}>
            {extractErrorMessage(wishlistQuery.error)}
          </Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centerWrap}>
          <EmptyState
            icon="heart-outline"
            title={t('wishlist.empty')}
            body={t('wishlist.listEmptyDesc')}
          />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={wishlistQuery.isRefetching}
          onRefresh={() => wishlistQuery.refetch()}
          renderItem={({ item, index }) => (
            <Animated.View
            >
              <ListingCard
                listing={item}
                variant="feed"
                saved
                onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                onToggleSave={() => unsaveMutation.mutate(item.id)}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.lg },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
  },
  headerCount: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
  },
  listContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.huge,
  },
  error: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
});
