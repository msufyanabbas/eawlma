import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { COLORS, FONTS, SIZES } from '../theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon = 'cube-outline', title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBubble}>
        <Ionicons name={icon} size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {ctaLabel ? (
        <Button mode="contained" onPress={onCta} style={styles.cta} buttonColor={COLORS.primary}>
          {ctaLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
    paddingHorizontal: SIZES.xl,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEEAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  cta: {
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadius,
  },
});
