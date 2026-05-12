// Mobile listing tile. Press scales the card down 3%; the heart taps
// independently of the card press so saving doesn't navigate away.
// All animations use RN's built-in `Animated` API (no reanimated).
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

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
  const scale = useRef(new Animated.Value(1)).current;
  const heart = useRef(new Animated.Value(saved ? 1.2 : 1)).current;
  const [localSaved, setLocalSaved] = useState(saved);

  const handleSave = () => {
    const next = !localSaved;
    setLocalSaved(next);
    // Pop the heart: scale up then settle.
    Animated.sequence([
      Animated.timing(heart, {
        toValue: next ? 1.35 : 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(heart, {
        toValue: next ? 1.2 : 1,
        damping: 8,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
    onToggleSave?.();
  };

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 12,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
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
    <Animated.View
      style={[isCarousel ? styles.carousel : styles.feed, { transform: [{ scale }] }]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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
            <Animated.View style={{ transform: [{ scale: heart }] }}>
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
  pressable: { overflow: 'hidden', borderRadius: SIZES.borderRadiusLg },
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
  priceText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: SIZES.small },
  typeBadge: {
    position: 'absolute',
    top: SIZES.sm,
    left: SIZES.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { color: COLORS.white, fontFamily: FONTS.medium, fontSize: SIZES.caption },
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
  title: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: SIZES.bodyLg, marginBottom: 4 },
  location: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginBottom: SIZES.sm,
  },
  statsRow: { flexDirection: 'row', gap: SIZES.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: FONTS.medium, fontSize: SIZES.small, color: COLORS.textSecondary },
  whatsappRow: { marginTop: SIZES.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
  whatsappText: { fontFamily: FONTS.medium, fontSize: SIZES.small, color: COLORS.success },
});
