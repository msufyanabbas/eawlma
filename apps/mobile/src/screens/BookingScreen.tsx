// BookingScreen — short-term booking flow. The date pickers are placeholders
// (an Alert prompts the user; full picker integration is left for the next
// iteration). Promo validation hits `/promos/validate` and either applies a
// discount or surfaces the API's reason.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { Header } from '@/components/Header';
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, extractErrorMessage, listingsApi } from '@/api';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'Booking'>;
type Nav = StackNavigationProp<RootStackParamList, 'Booking'>;

const SERVICE_FEE_PCT = 0.08;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function BookingScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { listingId } = route.params;

  const today = new Date();
  const [checkIn, setCheckIn] = useState<Date>(today);
  const [checkOut, setCheckOut] = useState<Date>(addDays(today, 2));
  const [guests, setGuests] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const listing = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsApi.getById(listingId),
  });

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const pricePerNight = listing.data?.price ?? 0;
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PCT);
  const total = Math.max(0, subtotal + serviceFee - discount);

  const promoMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ discount: number; message?: string }>(
        '/promos/validate',
        {
          code: promoCode,
          listingId,
          checkIn: isoDate(checkIn),
          checkOut: isoDate(checkOut),
          guests,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      setDiscount(data.discount ?? 0);
    },
    onError: (e) => {
      setDiscount(0);
      Alert.alert(t('promo.applyFailed'), extractErrorMessage(e));
    },
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiClient.post('/bookings', {
        listingId,
        checkIn: isoDate(checkIn),
        checkOut: isoDate(checkOut),
        guests,
        promoCode: promoCode || undefined,
      }),
    onSuccess: () => {
      Alert.alert(t('booking.success'), '', [{ text: t('common.confirm'), onPress: () => navigation.goBack() }]);
    },
    onError: (e) => Alert.alert(t('common.error'), extractErrorMessage(e)),
  });

  const promptDate = (which: 'in' | 'out') => {
    // Placeholder: a real date-picker would replace this prompt.
    Alert.alert(
      which === 'in' ? t('booking.checkIn') : t('booking.checkOut'),
      'Pick a date (placeholder)',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: '+1 day',
          onPress: () => {
            if (which === 'in') {
              const next = addDays(checkIn, 1);
              setCheckIn(next);
              if (next >= checkOut) setCheckOut(addDays(next, 1));
            } else {
              setCheckOut(addDays(checkOut, 1));
            }
          },
        },
      ],
    );
  };

  if (listing.isLoading || !listing.data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title={t('booking.bookNow')} />
        <View style={styles.center}>
          <BrandSpinner size={28} />
        </View>
      </View>
    );
  }

  const l = listing.data;
  const cover = l.thumbnailUrl ?? l.images?.[0] ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={t('booking.bookNow')} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Listing summary */}
        <Animated.View
          style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
        >
          {cover ? <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" /> : null}
          <View style={{ flex: 1, padding: SIZES.md }}>
            <Text style={[styles.lTitle, { color: colors.text }]} numberOfLines={1}>{l.title}</Text>
            <Text style={[styles.lCity, { color: colors.textSecondary }]} numberOfLines={1}>{l.city}</Text>
            <Text style={[styles.lPrice, { color: COLORS.primary }]}>
              {pricePerNight.toLocaleString()} {t('listing.currency')} / {t('booking.night')}
            </Text>
          </View>
        </Animated.View>

        {/* Dates */}
        <Animated.View style={styles.row2}>
          <DateField label={t('booking.checkIn')} value={isoDate(checkIn)} onPress={() => promptDate('in')} />
          <DateField label={t('booking.checkOut')} value={isoDate(checkOut)} onPress={() => promptDate('out')} />
        </Animated.View>

        {/* Guests */}
        <Animated.View
          style={[styles.stepper, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('booking.guests')}</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>{guests}</Text>
          </View>
          <View style={styles.stepperBtns}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setGuests((g) => Math.max(1, g - 1))}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setGuests((g) => g + 1)}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Promo */}
        <Animated.View style={styles.promoRow}>
          <TextInput
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder={t('promo.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
          />
          <Pressable
            style={[styles.promoBtn, { opacity: !promoCode ? 0.5 : 1 }]}
            disabled={!promoCode || promoMutation.isPending}
            onPress={() => promoMutation.mutate()}
          >
            {promoMutation.isPending ? <BrandSpinner size={16} /> : <Text style={styles.promoBtnText}>{t('promo.apply')}</Text>}
          </Pressable>
        </Animated.View>

        {/* Breakdown */}
        <Animated.View
          style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>{t('booking.priceBreakdown')}</Text>
          <Row label={`${pricePerNight.toLocaleString()} × ${nights} ${nights === 1 ? t('booking.night') : t('booking.nights')}`} value={`${subtotal.toLocaleString()} ${t('listing.currency')}`} />
          <Row label={t('booking.serviceFee')} value={`${serviceFee.toLocaleString()} ${t('listing.currency')}`} />
          {discount > 0 ? (
            <Row label={t('promo.discount')} value={`-${discount.toLocaleString()} ${t('listing.currency')}`} positive />
          ) : null}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{t('booking.total')}</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {total.toLocaleString()} {t('listing.currency')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={styles.confirmBtn}
          disabled={confirm.isPending}
          onPress={() => confirm.mutate()}
        >
          {confirm.isPending ? <BrandSpinner size={20} /> : <Text style={styles.confirmText}>{t('booking.confirm')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function DateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </Pressable>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.lineValue, { color: positive ? COLORS.success : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SIZES.lg, paddingBottom: SIZES.huge * 2 },
  summary: {
    flexDirection: 'row',
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cover: { width: 90, height: 90 },
  lTitle: { fontFamily: FONTS.bold, fontSize: SIZES.body },
  lCity: { fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: 2 },
  lPrice: { fontFamily: FONTS.bold, fontSize: SIZES.body, marginTop: 4 },
  row2: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.md },
  dateField: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
  },
  fieldLabel: { fontFamily: FONTS.regular, fontSize: SIZES.caption },
  fieldValue: { fontFamily: FONTS.bold, fontSize: SIZES.bodyLg, marginTop: 2 },
  stepper: {
    marginTop: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
  },
  stepperBtns: { flexDirection: 'row', gap: SIZES.sm },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },
  promoBtn: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm + 2,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
  },
  promoBtnText: { fontFamily: FONTS.bold, fontSize: SIZES.small, color: COLORS.white },
  breakdown: {
    marginTop: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
  },
  breakdownTitle: { fontFamily: FONTS.bold, fontSize: SIZES.subtitle, marginBottom: SIZES.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SIZES.sm },
  lineLabel: { fontFamily: FONTS.regular, fontSize: SIZES.body },
  lineValue: { fontFamily: FONTS.medium, fontSize: SIZES.body },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SIZES.md,
    marginTop: SIZES.sm,
    borderTopWidth: 1,
  },
  totalLabel: { fontFamily: FONTS.bold, fontSize: SIZES.bodyLg },
  totalValue: { fontFamily: FONTS.extraBold, fontSize: SIZES.subtitle },
  bottomBar: {
    padding: SIZES.md,
    borderTopWidth: 1,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  confirmText: { fontFamily: FONTS.bold, fontSize: SIZES.bodyLg, color: COLORS.white },
});
