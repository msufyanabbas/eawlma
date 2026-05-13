import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../theme';

export default function SavedScreen() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isAr ? 'المحفوظات' : 'Saved'}
        </Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="heart-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>
          {isAr ? 'لا توجد عقارات محفوظة' : 'No saved properties'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isAr
            ? 'احفظ العقارات التي تعجبك بالضغط على ❤️'
            : 'Save properties you like by tapping ❤️'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.h3, fontWeight: '800', color: '#FFF' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  emptyTitle: { fontSize: SIZES.subtitle, fontWeight: '700', color: COLORS.text, marginTop: SIZES.lg, textAlign: 'center' },
  emptySubtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.sm, textAlign: 'center' },
});
