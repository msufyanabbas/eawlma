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
// or the network request fails. Adds memory+disk caching and a recycling key
// so FlatList rows that scroll in/out don't refetch the same image. Backend
// listings frequently lack a coverImageUrl, so the fallback is the hot path.
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

  if (__DEV__) {
    // One-line debug so we can confirm Metro is shipping the URL to the device.
    // Truncated to keep the log readable in long S3 URLs.
    // eslint-disable-next-line no-console
    console.log('[SmartImage]', (uri as string).slice(0, 100));
  }

  return (
    <ExpoImage
      source={{ uri: uri! }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={uri!}
      transition={150}
      onError={(e) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[SmartImage] failed:', (uri as string).slice(0, 100), e?.error || '');
        }
        setFailed(true);
      }}
    />
  );
}
