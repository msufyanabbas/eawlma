import React, { useState } from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../hooks/useTheme';

interface User {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

interface Props {
  user?: User;
  size?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

// Renders an avatar that prefers the user's image but falls back to coloured
// initials when avatarUrl is missing or the image fails to load. Most users
// in the database don't have a real avatar, so the fallback is the common path.
export default function UserAvatar({ user, size = 48, style, backgroundColor }: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const hasImage = !!user?.avatarUrl && !failed;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {hasImage ? (
        <ExpoImage
          source={{ uri: user!.avatarUrl! }}
          style={{ width: size, height: size }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            fontSize: Math.round(size * 0.36),
            fontFamily: 'Tajawal_700Bold',
            color: '#FFF',
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
