import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  size?: 'small' | 'large';
  inline?: boolean;
}

export default function LoadingSpinner({ size = 'large', inline }: Props) {
  const { colors } = useTheme();
  return (
    <View style={inline ? styles.inline : styles.centered}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  inline: { padding: 16, alignItems: 'center' },
});
