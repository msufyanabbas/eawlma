// Mobile listing tile. Two variants: the wide "feed" card (used on Home, Saved,
// and Search list view) and a narrower "carousel" card for horizontal scrolls.
// Press scales down for tactile feedback; the heart taps independently of the
// card press so saving doesn't navigate away.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, FONTS, SHADOWS, SIZES } from '../theme';
import type { Listing } from '../api/listings.api';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=70';

interface ListingCardProps {
  listing: Listing;
  variant?: 'feed' | 'carousel';
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
  whatsappPhone?: string | null;
}

export function ListingCard({
  listing,
  variant = 'feed',
  saved = false,
  onPress,
  onToggleSave,
  whatsappPhone,
}: ListingCardProps) {
  const scale = useSharedValue(1);
  const heart = useSharedValue(saved ? 1 : 0);
  const [localSaved, setLocalSaved] = useState(saved);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + heart.value * 0.35 }],
  }));

  const handleSave = () => {
    const next = !localSaved;
    setLocalSaved(next);
    heart.value = withSpring(next ? 1 : 0, { damping: 8, stiffness: 220 });
    onToggleSave?.();
  };

  const handleWhatsapp = () => {
    if (!whatsappPhone) return;
    const number = whatsappPhone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hi, I'm interested in ${listing.referenceCode}`);
    void Linking.openURL(`whatsapp://send?phone=${number}&text=${text}`);
  };

  const imageUri = listing.thumbnailUrl ?? listing.images?.[0] ?? FALLBACK_IMAGE;
  const priceLabel = `${Math.round(listing.price).toLocaleString()} SAR${
    listing.type === 'rent' ? '/mo' : ''
  }`;

  const isCarousel = variant === 'carousel';

  return (
    <Animated.View style={[isCarousel ? styles.carousel : styles.feed, containerStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.97, { duration: 90 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 240 }))}
        style={styles.pressable}
      >
        <View style={isCarousel ? styles.carouselImageWrap : styles.feedImageWrap}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{priceLabel}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{listing.type === 'sale' ? 'For sale' : 'For rent'}</Text>
          </View>
          <Pressable onPress={handleSave} style={styles.heartButton} hitSlop={8}>
            <Animated.View style={heartStyle}>
              <Ionicons
                name={localSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={localSaved ? COLORS.error : COLORS.white}
              />
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text numberOfLines={isCarousel ? 1 : 2} style={styles.title}>
            {listing.title}
          </Text>
          <Text numberOfLines={1} style={styles.location}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />{' '}
            {listing.district ? `${listing.district}, ` : ''}
            {listing.city}
          </Text>

          <View style={styles.statsRow}>
            {listing.bedrooms != null && (
              <Stat icon="bed-outline" label={`${listing.bedrooms}`} />
            )}
            {listing.bathrooms != null && (
              <Stat icon="water-outline" label={`${listing.bathrooms}`} />
            )}
            {listing.area != null && <Stat icon="resize-outline" label={`${listing.area}m²`} />}
          </View>

          {whatsappPhone && !isCarousel ? (
            <Pressable onPress={handleWhatsapp} style={styles.whatsappRow}>
              <Ionicons name="logo-whatsapp" size={16} color={COLORS.success} />
              <Text style={styles.whatsappText}>WhatsApp</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Stat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusLg,
    marginBottom: SIZES.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  carousel: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusLg,
    marginRight: SIZES.md,
    width: 240,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  pressable: {
    overflow: 'hidden',
    borderRadius: SIZES.borderRadiusLg,
  },
  feedImageWrap: { height: 180, position: 'relative' },
  carouselImageWrap: { height: 140, position: 'relative' },
  image: { width: '100%', height: '100%' },
  priceBadge: {
    position: 'absolute',
    bottom: SIZES.sm,
    left: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
  },
  priceText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
  },
  typeBadge: {
    position: 'absolute',
    top: SIZES.sm,
    left: SIZES.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
  },
  heartButton: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: SIZES.md },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
    marginBottom: 4,
  },
  location: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginBottom: SIZES.sm,
  },
  statsRow: { flexDirection: 'row', gap: SIZES.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  whatsappRow: {
    marginTop: SIZES.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whatsappText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.success,
  },
});
