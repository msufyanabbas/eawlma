import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Dimensions, Platform, Image,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { inquiriesApi, listingsApi, savedApi } from '../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceText from '../components/PriceText';
import ListingCard from '../components/ListingCard';
import SmartImage from '../components/SmartImage';
import UserAvatar from '../components/UserAvatar';
import { listingCoverUrl } from '../utils/listingImages';

// Google Maps Static API key — wired through Expo extra so a single value in
// app.json (and the matching .env entry) drives Android/iOS native config and
// any HTTP-based static-tile request.
const GOOGLE_MAPS_KEY =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.googleMapsApiKey || '';

const { width: W } = Dimensions.get('window');

// Short-term property types are bookable — they show "Book Now" instead of
// "Send Inquiry". Kept in sync with the backend's SHORT_TERM_PROPERTY_TYPES.
const STAY_PROPERTY_TYPES = new Set([
  'chalet',
  'farm',
  'rest_house',
  'rest-house',
  'resthouse',
  'hotel_room',
  'hotel-room',
]);

export default function ListingDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { isAr, isRTL, backIcon, textAlign } = useRTL();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [showInquiry, setShowInquiry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const listing: any = data?.data || {};
  const agent: any = listing.agent || listing.user || {};

  // Dev-only diagnostics so unreachable Static Maps requests / missing keys
  // are easy to spot in the Metro log. Silent in production.
  useEffect(() => {
    if (!__DEV__) return;
    const keyOk = !!GOOGLE_MAPS_KEY && GOOGLE_MAPS_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
    if (!keyOk) {
      // eslint-disable-next-line no-console
      console.warn('[maps] googleMapsApiKey is missing or still a placeholder.');
      return;
    }
    if (listing?.lat == null || listing?.lng == null) return;
    const url = buildStaticMapUrl(listing.lat, listing.lng);
    // eslint-disable-next-line no-console
    console.log('[maps] static URL:', url.slice(0, 140));
    fetch(url)
      .then(async r => {
        // eslint-disable-next-line no-console
        console.log('[maps] HTTP', r.status, '·', r.headers.get('content-type'));
        if (r.status !== 200) {
          const body = await r.text();
          // eslint-disable-next-line no-console
          console.error('[maps] error body:', body.slice(0, 200));
        }
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('[maps] fetch failed:', err?.message);
      });
  }, [listing?.lat, listing?.lng]);

  const { data: similarData } = useQuery({
    queryKey: ['similar', listing.city, listing.type],
    queryFn: () => listingsApi.getAll({
      city: listing.city,
      type: listing.type || listing.transactionType,
      limit: 5,
    }),
    enabled: !!listing.city,
  });
  const similar: any[] = (
    similarData?.data?.data ||
    similarData?.data?.items ||
    similarData?.data ||
    []
  )
    .filter((l: any) => l.id !== id)
    .slice(0, 4);

  const propertyType = String(listing.propertyType || '').toLowerCase();
  const isStay = STAY_PROPERTY_TYPES.has(propertyType);

  const handleWhatsApp = () => {
    const phone = agent.phone?.replace(/\D/g, '');
    if (!phone) return;
    const msg = isAr
      ? `مرحباً، أنا مهتم بإعلان: ${listing.titleAr || ''}`
      : `Hello, I'm interested in: ${listing.titleEn || ''}`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleCall = () => {
    if (agent.phone) Linking.openURL(`tel:${agent.phone}`);
  };

  const handlePrimaryAction = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (isStay) {
      navigation.navigate('Booking', { listingId: id, listing });
      return;
    }
    setShowInquiry(true);
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    setSaving(true);
    try {
      if (isSaved) {
        await savedApi.unsave(id);
        setIsSaved(false);
      } else {
        await savedApi.save(id);
        setIsSaved(true);
      }
      qc.invalidateQueries({ queryKey: ['saved-listings'] });
    } catch (e: any) {
      Alert.alert(
        t('common.error'),
        e?.response?.data?.message || t('listing.actionFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingSpinner />
      </View>
    );
  }

  const amenities: string[] = [];
  if (listing.hasElevator) amenities.push(t('wizard.amenity.elevator'));
  if (listing.hasPool) amenities.push(t('wizard.amenity.pool'));
  if (listing.hasGarden) amenities.push(t('wizard.amenity.garden'));
  if (listing.hasGym) amenities.push(t('wizard.amenity.gym'));
  if (listing.hasMaidRoom) amenities.push(t('wizard.amenity.maidRoom'));
  if (listing.hasDriverRoom) amenities.push(t('wizard.amenity.driverRoom'));
  if (listing.hasCentralAC) amenities.push(t('wizard.amenity.centralAc'));
  if (listing.hasSecurity) amenities.push(t('wizard.amenity.security'));

  const primaryLabel = isStay ? t('listing.bookNow') : t('listing.sendInquiry');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroBox}>
          <SmartImage uri={listingCoverUrl(listing)} style={styles.heroImage} fallbackIconSize={64} />
          <SafeAreaView style={styles.heroNav} edges={['top']}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name={backIcon} size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleToggleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isSaved ? colors.error : '#FFF'}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <View style={[
            styles.heroBadge,
            { backgroundColor: listing.transactionType === 'rent' ? colors.success : colors.secondary },
          ]}>
            <Text style={[TYPOGRAPHY.small, { color: '#FFF', fontWeight: '800' }]}>
              {listing.transactionType === 'rent' ? t('listing.forRent') : t('listing.forSale')}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <PriceText
            value={listing.price}
            style={[TYPOGRAPHY.h1, { color: colors.primary }]}
            currencyStyle={[TYPOGRAPHY.h4, { color: colors.primary }]}
          />
          <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.sm, textAlign }]}>
            {isAr ? (listing.titleAr || listing.titleEn) : (listing.titleEn || listing.titleAr)}
          </Text>
          <View style={[styles.locRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
              {[listing.district, listing.city].filter(Boolean).join(', ')}
            </Text>
          </View>

          <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
            {listing.bedrooms != null && (
              <Stat icon="bed-outline" value={listing.bedrooms} label={t('listing.bedrooms')} colors={colors} />
            )}
            {listing.bathrooms != null && (
              <Stat icon="water-outline" value={listing.bathrooms} label={t('listing.bathrooms')} colors={colors} />
            )}
            {listing.area != null && (
              <Stat icon="resize-outline" value={listing.area} label="m²" colors={colors} />
            )}
            {listing.propertyType && (
              <Stat icon="business-outline" value={listing.propertyType} label={t('listing.propertyTypeLabel')} colors={colors} />
            )}
          </View>

          <SectionTitle colors={colors} textAlign={textAlign}>
            {t('listing.description')}
          </SectionTitle>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, lineHeight: 22, textAlign }]}>
            {(isAr
              ? (listing.descriptionAr || listing.descriptionEn)
              : (listing.descriptionEn || listing.descriptionAr)) || t('listing.noDescription')}
          </Text>

          {amenities.length > 0 && (
            <>
              <SectionTitle colors={colors} textAlign={textAlign}>
                {t('listing.amenities')}
              </SectionTitle>
              <View style={styles.amenitiesGrid}>
                {amenities.map(a => (
                  <View
                    key={a}
                    style={[styles.amenityChip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[TYPOGRAPHY.small, { color: colors.text }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {agent?.firstName && (
            <TouchableOpacity
              style={[
                styles.agentCard,
                { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => agent.id && navigation.navigate('AgentProfile', { id: agent.id })}
            >
              <UserAvatar user={agent} size={48} />
              <View style={styles.agentInfo}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>
                    {agent.firstName} {agent.lastName}
                  </Text>
                  {agent.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  )}
                </View>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, textAlign }]}>
                  {t('listing.agent')}
                </Text>
              </View>
              {agent.phone && (
                <>
                  <TouchableOpacity
                    style={[styles.actionCircle, { backgroundColor: colors.primary }]}
                    onPress={handleCall}
                  >
                    <Ionicons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionCircle, { backgroundColor: colors.whatsapp }]}
                    onPress={handleWhatsApp}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          )}

          {(listing.lat || listing.lng || listing.city) && (
            <>
              <SectionTitle colors={colors} textAlign={textAlign}>
                {t('listing.location')}
              </SectionTitle>
              {listing?.lat != null && listing?.lng != null ? (
                <TouchableOpacity
                  style={styles.mapContainer}
                  onPress={() => {
                    const label = encodeURIComponent(
                      listing.titleAr || listing.titleEn || 'Property',
                    );
                    const url = Platform.select({
                      ios: `maps:0,0?q=${label}@${listing.lat},${listing.lng}`,
                      android: `geo:${listing.lat},${listing.lng}?q=${listing.lat},${listing.lng}(${label})`,
                      default: `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`,
                    });
                    if (url) Linking.openURL(url).catch(() => undefined);
                  }}
                >
                  <Image
                    source={{ uri: buildStaticMapUrl(listing.lat, listing.lng) }}
                    style={styles.mapImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.openMapsBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="navigate" size={14} color="#FFF" />
                    <Text style={[TYPOGRAPHY.caption, { color: '#FFF', fontWeight: '700' }]}>
                      {t('listing.openInMaps')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.mapPlaceholder, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + '30' }]}
                  onPress={() => {
                    const q = encodeURIComponent(
                      [listing.district, listing.city, 'Saudi Arabia'].filter(Boolean).join(' '),
                    );
                    if (q) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => undefined);
                  }}
                >
                  <Ionicons name="location-outline" size={32} color={colors.textSecondary} />
                  <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
                    {[listing.district, listing.city].filter(Boolean).join(', ') ||
                      t('listing.locationNotSpecified')}
                  </Text>
                  <Text style={[TYPOGRAPHY.small, { color: colors.primary, marginTop: 4 }]}>
                    {t('listing.tapToOpenMap')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {similar.length > 0 && (
            <>
              <SectionTitle colors={colors} textAlign={textAlign}>
                {t('listing.similarProperties')}
              </SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SIZES.sm }}>
                {similar.map(item => (
                  <View key={item.id} style={{ width: W * 0.5 }}>
                    <ListingCard
                      item={item}
                      variant="grid"
                      onPress={() => navigation.push('ListingDetail', { id: item.id })}
                    />
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={handlePrimaryAction}
        >
          <Ionicons
            name={isStay ? 'calendar-outline' : 'chatbubble-ellipses-outline'}
            size={20}
            color="#FFF"
          />
          <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
            {primaryLabel}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      <InquiryModal
        visible={showInquiry}
        onClose={() => setShowInquiry(false)}
        listingId={id}
        colors={colors}
        t={t}
        isRTL={isRTL}
        textAlign={textAlign}
      />
    </View>
  );
}

function InquiryModal({
  visible, onClose, listingId, colors, t, isRTL, textAlign,
}: any) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<'phone' | 'email' | 'whatsapp'>('phone');

  const send = useMutation({
    mutationFn: () =>
      inquiriesApi.createInquiry({
        listingId,
        message,
        preferredContactMethod: contact,
      }),
    onSuccess: () => {
      setMessage('');
      onClose();
      Alert.alert(t('listing.sent'), t('listing.sentBody'));
    },
    onError: (err: any) => {
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || t('listing.actionFailed'),
      );
    },
  });

  const submit = () => {
    if (message.trim().length < 10) {
      Alert.alert(t('listing.messageTooShort'), t('listing.messageTooShortBody'));
      return;
    }
    send.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[modalStyles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>
              {t('listing.sendInquiryTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: SIZES.xs, textAlign }]}>
            {t('listing.yourMessage')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={t('listing.messagePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[
              modalStyles.textarea,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
                textAlign,
              },
            ]}
          />

          <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.md, marginBottom: SIZES.xs, textAlign }]}>
            {t('listing.preferredContact')}
          </Text>
          <View style={[modalStyles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {(['phone', 'whatsapp', 'email'] as const).map(c => {
              const active = c === contact;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setContact(c)}
                  style={[
                    modalStyles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
                    {c === 'phone'
                      ? t('listing.phone')
                      : c === 'whatsapp'
                        ? t('listing.whatsapp')
                        : t('listing.email')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            disabled={send.isPending}
            onPress={submit}
            style={[modalStyles.submitBtn, { backgroundColor: colors.primary }]}
          >
            {send.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
                {t('messages.send')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Build a Google Static Maps URL for the listing's coordinates. Uses the
// brand purple marker and a 2x scale tile for retina screens.
function buildStaticMapUrl(lat: number, lng: number): string {
  const params = [
    `center=${lat},${lng}`,
    'zoom=15',
    'size=600x300',
    'scale=2',
    'maptype=roadmap',
    `markers=color:0x6C63A6%7Csize:large%7C${lat},${lng}`,
    `key=${GOOGLE_MAPS_KEY}`,
  ].join('&');
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

function Stat({ icon, value, label, colors }: any) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{value}</Text>
      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children, colors, textAlign }: any) {
  return (
    <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginTop: SIZES.xl, marginBottom: SIZES.sm, textAlign }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heroBox: { width: W, height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm },
  heroActions: { flexDirection: 'row', gap: SIZES.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heroBadge: { position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, paddingHorizontal: SIZES.md, paddingVertical: 6, borderRadius: SIZES.borderRadiusFull },
  body: { padding: SIZES.lg },
  locRow: { alignItems: 'center', gap: SIZES.xs, marginTop: SIZES.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginTop: SIZES.lg, ...SHADOWS.sm },
  statBox: { alignItems: 'center', gap: 4, flex: 1 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SIZES.sm, paddingVertical: 6, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  agentCard: { alignItems: 'center', gap: SIZES.sm, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginTop: SIZES.xl, ...SHADOWS.sm },
  agentAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  agentInfo: { flex: 1 },
  actionCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholder: { height: 150, borderRadius: SIZES.borderRadiusLg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', marginTop: SIZES.sm },
  mapContainer: { height: 200, borderRadius: SIZES.borderRadiusLg, overflow: 'hidden', marginTop: SIZES.sm, position: 'relative' },
  mapImage: { width: '100%', height: '100%' },
  openMapsBtn: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: SIZES.lg, paddingTop: SIZES.md },
  contactBtn: { alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, height: 50, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.md },
});

const modalStyles = StyleSheet.create({
  sheet: { padding: SIZES.lg, borderTopLeftRadius: SIZES.borderRadiusXl, borderTopRightRadius: SIZES.borderRadiusXl, paddingBottom: SIZES.xxxl },
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.lg },
  textarea: { borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, minHeight: 100, fontSize: SIZES.body, textAlignVertical: 'top' },
  chipsRow: { gap: SIZES.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs + 2, borderRadius: SIZES.borderRadiusFull, borderWidth: 1 },
  submitBtn: { marginTop: SIZES.xl, height: 50, borderRadius: SIZES.borderRadiusLg, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
});
