import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRTL } from '../hooks/useRTL';
import { COLORS, SIZES, TYPOGRAPHY } from '../theme';

interface Props {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  variant?: 'primary' | 'surface';
}

export default function Header({ title, onBack, rightAction, variant = 'primary' }: Props) {
  const { backIcon } = useRTL();
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? COLORS.primary : COLORS.surface;
  const fg = isPrimary ? '#FFF' : COLORS.text;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: bg }}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name={backIcon} size={22} color={fg} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text style={[TYPOGRAPHY.h4, styles.title, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.iconBtn}>{rightAction}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, minHeight: 56 },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
});
