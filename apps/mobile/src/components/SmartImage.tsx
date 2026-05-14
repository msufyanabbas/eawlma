import React, { useState } from 'react';
import { View, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconSize?: number;
}

// Wraps expo-image with a graceful fallback when the URL is missing/invalid
// or the network request fails — backend listings frequently lack a
// coverImageUrl, so silently swap in a themed placeholder icon.
export default function SmartImage({
  uri,
  style,
  fallbackStyle,
  contentFit = 'cover',
  fallbackIcon = 'home',
  fallbackIconSize = 28,
}: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const hasUri = !!uri && typeof uri === 'string' && uri.trim().length > 0;

  if (!hasUri || failed) {
    return (
      <View
        style={[
          style as any,
          { backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
          fallbackStyle,
        ]}
      >
        <Ionicons name={fallbackIcon} size={fallbackIconSize} color={colors.primaryLight} />
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri: uri! }}
      style={style}
      contentFit={contentFit}
      onError={() => setFailed(true)}
      transition={150}
    />
  );
}
