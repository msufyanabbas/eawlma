import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { SIZES, TYPOGRAPHY } from '../theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={colors.border} />
      <Text style={[TYPOGRAPHY.subtitle, styles.title, { color: colors.text }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[TYPOGRAPHY.body, styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={onAction}
        >
          <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xxxl },
  title: { marginTop: SIZES.lg, textAlign: 'center' },
  subtitle: { marginTop: SIZES.sm, textAlign: 'center' },
  btn: { marginTop: SIZES.xl, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.md, borderRadius: SIZES.borderRadiusLg },
});
