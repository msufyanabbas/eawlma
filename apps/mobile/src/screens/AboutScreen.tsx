import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';

export default function AboutScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, textAlign, isRTL } = useRTL();
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('profile.about')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}>
        <View style={{ alignItems: 'center', marginVertical: SIZES.xl }}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 36, color: '#FFF', fontFamily: 'Tajawal_800ExtraBold' }}>
              {isAr ? 'عالمة' : 'Eawlma'}
            </Text>
          </View>
          <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginTop: SIZES.md }]}>
            {t('app.name')}
          </Text>
          <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: SIZES.xs }]}>
            v{version}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
            {t('about.appAbout')}
          </Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, lineHeight: 22, textAlign }]}>
            {t('about.appDescription')}
          </Text>
        </View>

        <Row
          icon="globe-outline"
          label={t('about.website')}
          value="eawlma.com"
          onPress={() => Linking.openURL('https://eawlma.com').catch(() => undefined)}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <Row
          icon="mail-outline"
          label={t('contact.email')}
          value="support@eawlma.com"
          onPress={() => Linking.openURL('mailto:support@eawlma.com').catch(() => undefined)}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <Row
          icon="help-circle-outline"
          label={t('profile.help')}
          onPress={() => navigation.navigate('Help')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <Row
          icon="document-text-outline"
          label={t('footer.termsOfService')}
          onPress={() => navigation.navigate('Terms')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <Row
          icon="shield-checkmark-outline"
          label={t('footer.privacyPolicy')}
          onPress={() => navigation.navigate('PrivacyPolicy')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value, onPress, colors, isRTL, textAlign }: any) {
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginHorizontal: SIZES.md }}>
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>{label}</Text>
        {value && (
          <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, marginTop: 2, textAlign }]}>
            {value}
          </Text>
        )}
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, borderRadius: 24, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
  card: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.lg, ...SHADOWS.sm },
  row: { alignItems: 'center', padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  rowIcon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center' },
});
