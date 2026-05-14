import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Dimensions, Platform,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
        isAr ? 'خطأ' : 'Error',
        e?.response?.data?.message || (isAr ? 'فشلت العملية' : 'Action failed'),
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
  if (listing.hasElevator) amenities.push(isAr ? 'مصعد' : 'Elevator');
  if (listing.hasPool) amenities.push(isAr ? 'مسبح' : 'Pool');
  if (listing.hasGarden) amenities.push(isAr ? 'حديقة' : 'Garden');
  if (listing.hasGym) amenities.push(isAr ? 'صالة رياضية' : 'Gym');
  if (listing.hasMaidRoom) amenities.push(isAr ? 'غرفة خادمة' : 'Maid Room');
  if (listing.hasDriverRoom) amenities.push(isAr ? 'غرفة سائق' : 'Driver Room');
  if (listing.hasCentralAC) amenities.push(isAr ? 'تكييف مركزي' : 'Central AC');
  if (listing.hasSecurity) amenities.push(isAr ? 'أمن' : 'Security');

  const primaryLabel = isStay
    ? (isAr ? 'احجز الآن' : 'Book Now')
    : (isAr ? 'إرسال استفسار' : 'Send Inquiry');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroBox}>
          <SmartImage uri={listing.coverImageUrl} style={styles.heroImage} fallbackIconSize={64} />
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
              {listing.transactionType === 'rent'
                ? (isAr ? 'للإيجار' : 'For Rent')
                : (isAr ? 'للبيع' : 'For Sale')}
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
              <Stat icon="bed-outline" value={listing.bedrooms} label={isAr ? 'غرف' : 'Beds'} colors={colors} />
            )}
            {listing.bathrooms != null && (
              <Stat icon="water-outline" value={listing.bathrooms} label={isAr ? 'حمامات' : 'Baths'} colors={colors} />
            )}
            {listing.area != null && (
              <Stat icon="resize-outline" value={listing.area} label="م²" colors={colors} />
            )}
            {listing.propertyType && (
              <Stat icon="business-outline" value={listing.propertyType} label={isAr ? 'النوع' : 'Type'} colors={colors} />
            )}
          </View>

          <SectionTitle colors={colors} textAlign={textAlign}>
            {isAr ? 'الوصف' : 'Description'}
          </SectionTitle>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, lineHeight: 22, textAlign }]}>
            {isAr
              ? (listing.descriptionAr || listing.descriptionEn || 'لا يوجد وصف.')
              : (listing.descriptionEn || listing.descriptionAr || 'No description.')}
          </Text>

          {amenities.length > 0 && (
            <>
              <SectionTitle colors={colors} textAlign={textAlign}>
                {isAr ? 'المرافق' : 'Amenities'}
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
                  {isAr ? 'وكيل عقاري' : 'Real Estate Agent'}
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
                {isAr ? 'الموقع' : 'Location'}
              </SectionTitle>
              <TouchableOpacity
                style={[styles.mapPlaceholder, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + '30' }]}
                onPress={() => {
                  const lat = listing?.lat;
                  const lng = listing?.lng;
                  const label = encodeURIComponent(
                    listing.titleAr || listing.titleEn || 'Property',
                  );
                  let url: string | undefined;
                  if (lat != null && lng != null) {
                    url = Platform.select({
                      ios: `maps:${lat},${lng}?q=${label}`,
                      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
                      default: `https://www.google.com/maps?q=${lat},${lng}`,
                    });
                  } else {
                    const q = encodeURIComponent(
                      [listing.district, listing.city].filter(Boolean).join(', '),
                    );
                    url = `https://www.google.com/maps?q=${q}`;
                  }
                  if (url) Linking.openURL(url).catch(() => undefined);
                }}
              >
                <Ionicons name="map-outline" size={36} color={colors.primary} />
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary, marginTop: 6 }]}>
                  {isAr ? 'عرض على الخريطة' : 'View on Map'}
                </Text>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2 }]}>
                  {[listing.district, listing.city].filter(Boolean).join(', ') ||
                    `${listing.lat?.toFixed(4)}, ${listing.lng?.toFixed(4)}`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {similar.length > 0 && (
            <>
              <SectionTitle colors={colors} textAlign={textAlign}>
                {isAr ? 'إعلانات مشابهة' : 'Similar Listings'}
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
        isAr={isAr}
        isRTL={isRTL}
        textAlign={textAlign}
      />
    </View>
  );
}

function InquiryModal({
  visible, onClose, listingId, colors, isAr, isRTL, textAlign,
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
      Alert.alert(
        isAr ? 'تم الإرسال' : 'Sent',
        isAr ? 'تم إرسال استفسارك بنجاح' : 'Your inquiry was sent',
      );
    },
    onError: (err: any) => {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        err?.response?.data?.message || (isAr ? 'فشل الإرسال' : 'Failed to send'),
      );
    },
  });

  const submit = () => {
    if (message.trim().length < 10) {
      Alert.alert(
        isAr ? 'الرسالة قصيرة' : 'Message too short',
        isAr ? 'يجب أن تكون الرسالة 10 أحرف على الأقل' : 'Message must be at least 10 characters',
      );
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
              {isAr ? 'إرسال استفسار' : 'Send Inquiry'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginBottom: SIZES.xs, textAlign }]}>
            {isAr ? 'رسالتك' : 'Your message'}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
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
            {isAr ? 'طريقة التواصل المفضلة' : 'Preferred contact'}
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
                      ? (isAr ? 'هاتف' : 'Phone')
                      : c === 'whatsapp'
                        ? 'WhatsApp'
                        : (isAr ? 'بريد' : 'Email')}
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
                {isAr ? 'إرسال' : 'Send'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
  mapPlaceholder: { height: 150, borderRadius: SIZES.borderRadiusLg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
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
