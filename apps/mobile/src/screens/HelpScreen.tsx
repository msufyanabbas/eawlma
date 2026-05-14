import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_IDS = [1, 2, 3, 4, 5, 6] as const;

export default function HelpScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isRTL, textAlign } = useRTL();
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === idx ? null : idx);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('help.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}>
        <Text style={[TYPOGRAPHY.h4, { color: colors.text, marginBottom: SIZES.md, textAlign }]}>
          {t('help.faqTitle')}
        </Text>
        {FAQ_IDS.map((id) => {
          const isOpen = open === id;
          return (
            <View
              key={id}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => toggle(id)}
              >
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, textAlign }]}>
                  {t(`help.faqs.q${id}`)}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : (isRTL ? 'chevron-back' : 'chevron-forward')}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {isOpen && (
                <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, lineHeight: 22, marginTop: SIZES.sm, textAlign }]}>
                  {t(`help.faqs.a${id}`)}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  row: { alignItems: 'center', gap: SIZES.sm },
});
