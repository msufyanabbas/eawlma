import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { bookingsApi, listingsApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import SmartImage from '../components/SmartImage';
import { listingCoverUrl } from '../utils/listingImages';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function nightsBetween(from: string, to: string): number {
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export default function BookingScreen({ navigation, route }: any) {
  const { listingId, listing: passedListing } = route.params || {};
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsApi.getById(listingId),
    enabled: !!listingId && !passedListing,
  });
  const listing: any = passedListing || data?.data || {};

  const today = new Date().toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const pricePerNight = Number(listing.pricePerNight || listing.price || 0);
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;

  const create = useMutation({
    mutationFn: () => bookingsApi.create({
      listingId,
      checkIn,
      checkOut,
      numGuests: Number(guests) || 1,
      notes: notes || undefined,
    }),
    onSuccess: (resp: any) => {
      const paymentUrl = resp?.paymentUrl || resp?.data?.paymentUrl;
      Alert.alert(
        t('booking.created'),
        t('booking.createdBody'),
        [
          {
            text: t('wizard.ok'),
            onPress: () => {
              if (paymentUrl) {
                if (Platform.OS === 'web') {
                  window.location.href = paymentUrl;
                } else {
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  const { Linking } = require('react-native');
                  Linking.openURL(paymentUrl);
                }
              } else {
                navigation.goBack();
              }
            },
          },
        ],
      );
    },
    onError: (err: any) => {
      Alert.alert(
        t('booking.error'),
        err?.response?.data?.message || t('booking.failed'),
      );
    },
  });

  const submit = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) {
      Alert.alert(t('booking.invalidDates'), t('booking.invalidDatesBody'));
      return;
    }
    if (nights < 1) {
      Alert.alert(t('booking.tooShort'), t('booking.tooShortBody'));
      return;
    }
    create.mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={t('booking.shortTitle')} onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('booking.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.lg, paddingBottom: 140 }}>
        <View style={[styles.card, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <SmartImage uri={listingCoverUrl(listing)} style={styles.thumb} fallbackIconSize={28} />
          <View style={{ flex: 1, padding: SIZES.md }}>
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]} numberOfLines={2}>
              {isAr ? (listing.titleAr || listing.titleEn) : (listing.titleEn || listing.titleAr)}
            </Text>
            <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]}>
              {[listing.district, listing.city].filter(Boolean).join(', ')}
            </Text>
            {pricePerNight > 0 && (
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary, marginTop: SIZES.xs, textAlign }]}>
                {pricePerNight.toLocaleString()} {t('booking.perNight')}
              </Text>
            )}
          </View>
        </View>

        <Section colors={colors} textAlign={textAlign}>
          {t('booking.checkIn')}
        </Section>
        <TextInput
          value={checkIn}
          onChangeText={setCheckIn}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign }]}
        />

        <Section colors={colors} textAlign={textAlign}>
          {t('booking.checkOut')}
        </Section>
        <TextInput
          value={checkOut}
          onChangeText={setCheckOut}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign }]}
        />

        <Section colors={colors} textAlign={textAlign}>
          {t('booking.guests')}
        </Section>
        <TextInput
          value={guests}
          onChangeText={setGuests}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign }]}
        />

        <Section colors={colors} textAlign={textAlign}>
          {t('booking.notesOptional')}
        </Section>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={t('booking.notesPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign },
          ]}
        />

        {nights > 0 && (
          <View style={[styles.breakdown, { backgroundColor: colors.surface }]}>
            <BreakdownRow
              label={`${pricePerNight.toLocaleString()} × ${nights} ${t('booking.nights')}`}
              value={subtotal}
              colors={colors}
              isRTL={isRTL}
            />
            <BreakdownRow
              label={t('booking.serviceFee')}
              value={serviceFee}
              colors={colors}
              isRTL={isRTL}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <BreakdownRow
              label={t('booking.totalLabel')}
              value={total}
              colors={colors}
              isRTL={isRTL}
              bold
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={submit}
          disabled={create.isPending}
        >
          {create.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
              {t('booking.bookNow')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ children, colors, textAlign }: any) {
  return (
    <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.md, marginBottom: SIZES.xs, textAlign }]}>
      {children}
    </Text>
  );
}

function BreakdownRow({ label, value, colors, isRTL, bold }: any) {
  return (
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[bold ? TYPOGRAPHY.bodyBold : TYPOGRAPHY.body, { color: colors.text }]}>
        {label}
      </Text>
      <Text style={[bold ? TYPOGRAPHY.bodyBold : TYPOGRAPHY.body, { color: bold ? colors.primary : colors.text }]}>
        {Number(value).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', ...SHADOWS.sm },
  thumb: { width: 96, height: 96 },
  input: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, fontSize: SIZES.body, height: 48 },
  textarea: { height: 80, textAlignVertical: 'top' },
  breakdown: { marginTop: SIZES.xl, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.sm },
  divider: { height: 1, marginVertical: SIZES.sm },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.lg, borderTopWidth: 1 },
  bookBtn: { height: 52, borderRadius: SIZES.borderRadiusLg, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
});
