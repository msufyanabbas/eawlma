// Purple gradient app header used by the auth screens, Profile, Wallet, etc.
// Tabs use their own purple-less surfaces — this is for "stack" screens where
// we want the brand colour edge-to-edge under the status bar.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS, SIZES } from '../theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  variant?: 'brand' | 'transparent' | 'surface';
}

export function Header({
  title,
  subtitle,
  showBack = true,
  right,
  variant = 'brand',
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const backgroundColor =
    variant === 'brand'
      ? COLORS.primary
      : variant === 'surface'
        ? COLORS.surface
        : 'transparent';
  const textColor = variant === 'brand' ? COLORS.white : COLORS.text;
  const subColor = variant === 'brand' ? 'rgba(255,255,255,0.78)' : COLORS.textSecondary;

  return (
    <View style={[styles.root, { paddingTop: insets.top + SIZES.sm, backgroundColor }]}>
      <View style={styles.row}>
        {showBack && navigation.canGoBack() ? (
          <TouchableOpacity
            onPress={navigation.goBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.iconButton, variant === 'brand' && styles.iconButtonBrand]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={textColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}

        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={[styles.subtitle, { color: subColor }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBrand: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.title,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginTop: 2,
  },
  rightSlot: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});
