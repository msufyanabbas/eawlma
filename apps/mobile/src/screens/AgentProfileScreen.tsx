import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { agentsApi } from '../api';
import { useTheme } from '../hooks/useTheme';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';
import EmptyState from '../components/EmptyState';
import UserAvatar from '../components/UserAvatar';

const { width: W } = Dimensions.get('window');

export default function AgentProfileScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();

  const { data: agentData, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.getById(id),
  });

  const { data: listingsData } = useQuery({
    queryKey: ['agent-listings', id],
    queryFn: () => agentsApi.getListings(id),
  });

  const agent: any = agentData?.data || agentData || {};
  const listings: any[] = listingsData?.data?.data || listingsData?.data || [];

  const callPhone = () => {
    if (agent.phone) Linking.openURL(`tel:${agent.phone}`);
  };

  const openWhatsApp = () => {
    if (agent.phone) {
      const phone = agent.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={t('agents.agent')} onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || t('agents.agent');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={fullName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: SIZES.xxxl }}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <UserAvatar user={agent} size={80} />
          <View style={styles.nameRow}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{fullName}</Text>
            {agent.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </View>
          {agent.bio && (
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SIZES.sm }]}>
              {agent.bio}
            </Text>
          )}

          <View style={styles.statsRow}>
            <Stat label={t('agents.listings')} value={listings.length} colors={colors} />
            <Stat label={t('agents.reviews')} value={agent.reviewCount || 0} colors={colors} />
            <Stat label={t('agents.rating')} value={agent.averageRating?.toFixed(1) || '—'} colors={colors} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={callPhone}
              disabled={!agent.phone}
            >
              <Ionicons name="call" size={18} color="#FFF" />
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>
                {t('agents.call')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.whatsapp }]}
              onPress={openWhatsApp}
              disabled={!agent.phone}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.reviewsLink, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Reviews', { mode: 'agent', id })}
          >
            <Ionicons name="star-outline" size={16} color={colors.primary} />
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary }]}>
              {t('agents.viewReviews')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginHorizontal: SIZES.lg, marginBottom: SIZES.md }]}>
            {t('agents.listings')}
          </Text>
          {listings.length === 0 ? (
            <EmptyState
              icon="home-outline"
              title={t('agents.noListings')}
            />
          ) : (
            <View style={styles.grid}>
              {listings.map(item => (
                <ListingCard
                  key={item.id}
                  item={item}
                  variant="grid"
                  onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={[TYPOGRAPHY.h3, { color: colors.primary }]}>{value}</Text>
      <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { margin: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.borderRadiusXl, alignItems: 'center', ...SHADOWS.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs, marginTop: SIZES.md },
  statsRow: { flexDirection: 'row', gap: SIZES.xl, marginTop: SIZES.lg },
  statBox: { alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg, alignSelf: 'stretch' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.xs, paddingVertical: SIZES.md, borderRadius: SIZES.borderRadiusLg },
  reviewsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.xs, marginTop: SIZES.md, paddingVertical: SIZES.sm, paddingHorizontal: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 1 },
  section: { marginTop: SIZES.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, paddingHorizontal: SIZES.lg },
});
