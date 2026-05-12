// ListingDetailScreen — full-bleed photo gallery, then a scrollable detail
// surface with property facts, description, amenities, and an agent card.
// Two CTAs ("Schedule tour" / "Send inquiry") are pinned above the home
// indicator. The header (back + share) floats over the gallery, so the
// gallery starts at y=0 and we use the safe-area inset on the floating
// chips, not the scroll container.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { BrandSpinner } from '@/components/LoadingScreen';
import { listingsApi } from '@/api';
import type { Listing } from '@/api/listings.api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'ListingDetail'>;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=70';

const AMENITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  parking: 'car-outline',
  pool: 'water-outline',
  gym: 'barbell-outline',
  garden: 'leaf-outline',
  security: 'shield-checkmark-outline',
  elevator: 'swap-vertical-outline',
  furnished: 'bed-outline',
  wifi: 'wifi-outline',
  ac: 'snow-outline',
};

export function ListingDetailScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'ListingDetail'>>().params;
  const { width: windowWidth } = useWindowDimensions();

  const [activeImage, setActiveImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const galleryRef = useRef<FlatList<string>>(null);

  const { data: listing, isLoading, isError, refetch } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const images = useMemo(() => {
    if (!listing) return [FALLBACK_IMAGE];
    const list = listing.images?.length ? listing.images : null;
    if (list) return list;
    return [listing.thumbnailUrl ?? FALLBACK_IMAGE];
  }, [listing]);

  const onShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `${listing.title} - ${listing.referenceCode}`,
      });
    } catch {
      // user cancelled
    }
  };

  const openTel = (digits?: string | null) => {
    if (!digits) return;
    void Linking.openURL(`tel:${digits.replace(/[^0-9+]/g, '')}`);
  };
  const openWhatsapp = (digits?: string | null) => {
    if (!digits) return;
    void Linking.openURL(
      `whatsapp://send?phone=${digits.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
        t('listing.sendInquiry'),
      )}`,
    );
  };

  // ----- States -----------------------------------------------------------
  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.gallerySkeleton}>
          <BrandSpinner size={36} />
        </View>
        <FloatingHeader insetTop={insets.top} onBack={navigation.goBack} onShare={onShare} />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View style={[styles.root, styles.errorRoot, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('search.noResults')}
          body={t('common.loading')}
          ctaLabel={t('search.applyFilters')}
          onCta={() => refetch()}
        />
        <FloatingHeader insetTop={insets.top} onBack={navigation.goBack} onShare={onShare} />
      </View>
    );
  }

  // ----- Render ----------------------------------------------------------
  const priceLabel = `${Math.round(listing.price).toLocaleString()} ${t('listing.currency', {
    defaultValue: 'SAR',
  })}${listing.type === 'rent' ? '/mo' : ''}`;

  // Amenities aren't on the Listing type yet; we render only if present.
  const amenities: string[] = ((listing as unknown as { amenities?: string[] }).amenities ??
    []) as string[];

  // Agent — pull from optional fields if present, otherwise show placeholder.
  const agent = (listing as unknown as {
    agent?: { id?: string; fullName?: string; phone?: string; avatarUrl?: string; isVerified?: boolean };
  }).agent;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gallery */}
        <View>
          <FlatList
            ref={galleryRef}
            data={images}
            keyExtractor={(uri, idx) => `${idx}-${uri}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
              setActiveImage(next);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: windowWidth, height: 320 }}
                contentFit="cover"
                transition={200}
              />
            )}
          />

          {/* Page indicators */}
          {images.length > 1 ? (
            <View style={styles.dotsRow}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === activeImage ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          {/* Price + type badges */}
          <View style={styles.galleryBadges}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{priceLabel}</Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {listing.type === 'sale' ? t('home.tabBuy') : t('home.tabRent')}
              </Text>
            </View>
          </View>
        </View>

        {/* Title + location */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
          <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {listing.district ? `${listing.district}, ` : ''}
              {listing.city}
            </Text>
            {listing.isVerified ? (
              <View style={styles.regaBadge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Text style={styles.regaText}>REGA</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Facts */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={[styles.factsRow, styles.section]}
        >
          <FactCard
            icon="bed-outline"
            label={t('listing.bedroom')}
            value={listing.bedrooms != null ? `${listing.bedrooms}` : '—'}
            colors={colors}
          />
          <FactCard
            icon="water-outline"
            label={t('listing.bathroom')}
            value={listing.bathrooms != null ? `${listing.bathrooms}` : '—'}
            colors={colors}
          />
          <FactCard
            icon="resize-outline"
            label={t('listing.area')}
            value={
              listing.area != null
                ? `${listing.area} ${t('listing.areaUnit', { defaultValue: 'm²' })}`
                : '—'
            }
            colors={colors}
          />
        </Animated.View>

        {/* Description */}
        {listing.description ? (
          <Animated.View
            entering={FadeInDown.delay(140).duration(400)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('listing.details')}
            </Text>
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={descExpanded ? undefined : 5}
            >
              {listing.description}
            </Text>
            {listing.description.length > 200 ? (
              <Pressable onPress={() => setDescExpanded((v) => !v)} hitSlop={8}>
                <Text style={styles.showMoreText}>
                  {descExpanded ? t('home.viewMore') + ' ←' : t('home.viewMore') + ' →'}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Amenities */}
        {amenities.length > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(180).duration(400)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('listing.amenities')}
            </Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((a) => (
                <View
                  key={a}
                  style={[
                    styles.amenityChip,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name={AMENITY_ICONS[a.toLowerCase()] ?? 'checkmark-circle-outline'}
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={[styles.amenityText, { color: colors.text }]}>{a}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* Agent card */}
        <Animated.View
          entering={FadeInDown.delay(220).duration(400)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('listing.contactAgent')}
          </Text>
          <View style={[styles.agentCard, { backgroundColor: colors.surface }, SHADOWS.sm]}>
            <View style={styles.agentTopRow}>
              {agent?.avatarUrl ? (
                <Image source={{ uri: agent.avatarUrl }} style={styles.agentAvatar} />
              ) : (
                <View style={[styles.agentAvatar, styles.agentAvatarFallback]}>
                  <Text style={styles.agentInitial}>
                    {(agent?.fullName ?? 'A').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                  {agent?.fullName ?? t('listing.contactAgent')}
                </Text>
                {agent?.isVerified ? (
                  <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                    <Text style={styles.verifiedText}>{t('listing.details')}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.agentActions}>
              <Pressable
                onPress={() => openTel(agent?.phone ?? null)}
                style={[styles.agentBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              </Pressable>
              <Pressable
                onPress={() => openWhatsapp(agent?.phone ?? null)}
                style={[styles.agentBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.success} />
              </Pressable>
              <Pressable
                onPress={() =>
                  navigation.navigate('Chat', {
                    threadId: `listing:${listing.id}`,
                    otherUserId: agent?.id,
                  })
                }
                style={[styles.agentBtn, styles.agentMessageBtn]}
              >
                <Ionicons name="chatbubble-outline" size={16} color={COLORS.white} />
                <Text style={styles.agentMessageLabel}>{t('listing.sendInquiry')}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating header chips */}
      <FloatingHeader insetTop={insets.top} onBack={navigation.goBack} onShare={onShare} />

      {/* Fixed bottom CTAs */}
      <Animated.View
        entering={FadeIn.delay(280).duration(300)}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + SIZES.md,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Booking', { listingId: listing.id })}
          style={styles.bottomBtnOutline}
          textColor={COLORS.primary}
          labelStyle={styles.bottomBtnLabel}
        >
          {t('listing.scheduleATour')}
        </Button>
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate('Chat', {
              threadId: `listing:${listing.id}`,
              otherUserId: agent?.id,
            })
          }
          buttonColor={COLORS.primary}
          textColor={COLORS.white}
          style={styles.bottomBtnSolid}
          labelStyle={styles.bottomBtnLabel}
        >
          {t('listing.sendInquiry')}
        </Button>
      </Animated.View>
    </View>
  );
}

// ----- helpers ----------------------------------------------------------
function FactCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.factCard, { backgroundColor: colors.surface }, SHADOWS.sm]}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={[styles.factValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.factLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FloatingHeader({
  insetTop,
  onBack,
  onShare,
}: {
  insetTop: number;
  onBack: () => void;
  onShare: () => void;
}) {
  return (
    <View style={[styles.floatingHeader, { top: insetTop + SIZES.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={onBack}
        style={styles.circleBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color={COLORS.white} />
      </Pressable>
      <View style={styles.floatingRight}>
        <Pressable
          onPress={onShare}
          style={styles.circleBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={20} color={COLORS.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorRoot: { justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {},

  gallerySkeleton: {
    height: 320,
    backgroundColor: '#EFEFF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotsRow: {
    position: 'absolute',
    bottom: SIZES.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 16,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  galleryBadges: {
    position: 'absolute',
    bottom: SIZES.xl + SIZES.sm,
    left: SIZES.lg,
    right: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  priceBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
    ...SHADOWS.md,
  },
  priceBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  typeBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.white,
  },

  floatingHeader: {
    position: 'absolute',
    left: SIZES.lg,
    right: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingRight: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.xl,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SIZES.sm,
    flexWrap: 'wrap',
  },
  locationText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },
  regaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: '#E6F8EC',
    marginStart: SIZES.sm,
  },
  regaText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.caption,
    color: COLORS.success,
    letterSpacing: 0.5,
  },

  factsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  factCard: {
    flex: 1,
    borderRadius: SIZES.borderRadiusLg,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    alignItems: 'center',
    gap: 2,
  },
  factValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    marginTop: 4,
  },
  factLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
  },

  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    marginBottom: SIZES.sm,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    lineHeight: 22,
  },
  showMoreText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
    marginTop: SIZES.sm,
  },

  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  amenityText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
  },

  agentCard: {
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.md,
  },
  agentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEEAFF',
  },
  agentAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentInitial: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    color: COLORS.primary,
  },
  agentName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.success,
  },
  agentActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.md,
  },
  agentBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentMessageBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    height: 44,
    borderRadius: SIZES.borderRadius,
  },
  agentMessageLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...SHADOWS.md,
  },
  bottomBtnOutline: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    borderColor: COLORS.primary,
  },
  bottomBtnSolid: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
  },
  bottomBtnLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
  },
});
