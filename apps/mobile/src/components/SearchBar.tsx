import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

import { COLORS, FONTS, SHADOWS, SIZES } from '../theme';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  city?: string;
  onCityPress?: () => void;
  onSubmit?: (text: string) => void;
}

export function SearchBar({
  city,
  onCityPress,
  onSubmit,
  placeholder,
  value,
  onChangeText,
  ...rest
}: SearchBarProps) {
  const [internal, setInternal] = useState('');
  const text = value ?? internal;
  const handleChange = (next: string) => {
    setInternal(next);
    onChangeText?.(next);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={COLORS.textMuted} />
      <TextInput
        {...rest}
        value={text}
        onChangeText={handleChange}
        onSubmitEditing={(e) => onSubmit?.(e.nativeEvent.text)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
        returnKeyType="search"
      />
      {city ? (
        <TouchableOpacity onPress={onCityPress} style={styles.cityChip} hitSlop={8}>
          <Ionicons name="location-outline" size={14} color={COLORS.primary} />
          <Text style={styles.cityText} numberOfLines={1}>
            {city}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusXl,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.text,
    paddingVertical: 0,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEEAFF',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
    maxWidth: 120,
  },
  cityText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
});
