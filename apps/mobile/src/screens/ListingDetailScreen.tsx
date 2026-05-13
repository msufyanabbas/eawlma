import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';
import { listingsApi } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

const { width: W } = Dimensions.get('window');

export default function ListingDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const listing: any = data?.data || {};
  const agent = listing.agent || listing.user || {};

  const handleWhatsApp = () => {
    const phone = agent.phone?.replace(/\D/g, '');
    if (!phone) return;
    const msg = isAr
      ? `مرحباً، أنا مهتم بإعلان: ${listing.titleAr}`
      : `Hello, I'm interested in: ${listing.titleEn}`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Chat', {
      conversationId: agent.id || 'new',
      recipientName: `${agent.firstName} ${agent.lastName}`,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroBox}>
          {listing.coverImageUrl ? (
            <Image
              source={{ uri: listing.coverImageUrl }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroEmpty]}>
              <Ionicons name="home" size={64} color={COLORS.primaryLight} />
            </View>
          )}
          <SafeAreaView style={styles.heroNav} edges={['top']}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons
                name={isAr ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color="#FFF"
              />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="heart-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <View style={[
            styles.heroBadge,
            { backgroundColor: listing.transactionType === 'rent' ? COLORS.success : COLORS.secondary }
          ]}>
            <Text style={styles.heroBadgeText}>
              {listing.transactionType === 'rent'
                ? (isAr ? 'للإيجار' : 'For Rent')
                : (isAr ? 'للبيع' : 'For Sale')}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.price}>
            {Number(listing.price || 0).toLocaleString()}
            <Text style={styles.priceCurrency}> {isAr ? 'ر.س' : 'SAR'}</Text>
          </Text>
          <Text style={styles.title}>
            {isAr ? listing.titleAr : listing.titleEn}
          </Text>
          <View style={styles.locRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.locText}>
              {listing.district}, {listing.city}
            </Text>
          </View>

          <View style={styles.statsRow}>
            {listing.bedrooms != null && (
              <View style={styles.statBox}>
                <Ionicons name="bed-outline" size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{listing.bedrooms}</Text>
                <Text style={styles.statLabel}>{isAr ? 'غرف' : 'Beds'}</Text>
              </View>
            )}
            {listing.bathrooms != null && (
              <View style={styles.statBox}>
                <Ionicons name="water-outline" size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{listing.bathrooms}</Text>
                <Text style={styles.statLabel}>{isAr ? 'حمامات' : 'Baths'}</Text>
              </View>
            )}
            {listing.area != null && (
              <View style={styles.statBox}>
                <Ionicons name="resize-outline" size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{listing.area}</Text>
                <Text style={styles.statLabel}>م²</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>
            {isAr ? 'الوصف' : 'Description'}
          </Text>
          <Text style={styles.description}>
            {isAr ? listing.descriptionAr : listing.descriptionEn || (isAr ? 'لا يوجد وصف.' : 'No description.')}
          </Text>

          {agent?.firstName && (
            <TouchableOpacity
              style={styles.agentCard}
              onPress={() => agent.id && navigation.navigate('AgentProfile', { id: agent.id })}
            >
              <View style={styles.agentAvatar}>
                <Text style={styles.agentAvatarText}>{agent.firstName?.[0]}</Text>
              </View>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>
                  {agent.firstName} {agent.lastName}
                </Text>
                <Text style={styles.agentLabel}>
                  {isAr ? 'وكيل عقاري' : 'Real Estate Agent'}
                </Text>
              </View>
              {agent.phone && (
                <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" />
          <Text style={styles.contactBtnText}>
            {isAr ? 'تواصل مع الوكيل' : 'Contact Agent'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroBox: { width: W, height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroEmpty: { backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm },
  heroActions: { flexDirection: 'row', gap: SIZES.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heroBadge: { position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, paddingHorizontal: SIZES.md, paddingVertical: 6, borderRadius: SIZES.borderRadiusFull },
  heroBadgeText: { color: '#FFF', fontWeight: '800', fontSize: SIZES.small },
  body: { padding: SIZES.lg },
  price: { fontSize: SIZES.h1, fontWeight: '900', color: COLORS.primary },
  priceCurrency: { fontSize: SIZES.subtitle, fontWeight: '700' },
  title: { fontSize: SIZES.title, fontWeight: '700', color: COLORS.text, marginTop: SIZES.sm },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs, marginTop: SIZES.sm },
  locText: { fontSize: SIZES.body, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginTop: SIZES.lg, ...SHADOWS.sm },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: SIZES.subtitle, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: SIZES.small, color: COLORS.textSecondary },
  sectionTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: COLORS.text, marginTop: SIZES.xl, marginBottom: SIZES.sm },
  description: { fontSize: SIZES.body, color: COLORS.textSecondary, lineHeight: 22 },
  agentCard: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginTop: SIZES.xl, ...SHADOWS.sm },
  agentAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { fontSize: SIZES.title, fontWeight: '800', color: '#FFF' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: SIZES.bodyLg, fontWeight: '700', color: COLORS.text },
  agentLabel: { fontSize: SIZES.small, color: COLORS.textSecondary },
  whatsappBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.whatsapp, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SIZES.lg, paddingTop: SIZES.md },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, height: 50, borderRadius: SIZES.borderRadiusLg, ...SHADOWS.md },
  contactBtnText: { color: '#FFF', fontSize: SIZES.bodyLg, fontWeight: '800' },
});
