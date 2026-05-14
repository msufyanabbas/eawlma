import React, { useState } from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../hooks/useTheme';

interface User {
  id?: string | null;
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

// Palette of avatar background colours used when no image is available. We
// derive an index from the user's id so the same person always renders with
// the same colour across screens, instead of every avatar being the brand
// primary purple.
const AVATAR_PALETTE = [
  '#6C63A6', '#D4A843', '#22C55E', '#3B82F6',
  '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444',
  '#0EA5E9', '#14B8A6',
];

function colourFromId(id?: string | null): string {
  if (!id) return AVATAR_PALETTE[0];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

export default function UserAvatar({ user, size = 48, style, backgroundColor }: Props) {
  const { colors: themeColors } = useTheme();
  const [failed, setFailed] = useState(false);

  const hasImage = !!user?.avatarUrl && !failed;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  const bg =
    backgroundColor ||
    (hasImage ? themeColors.primary : colourFromId(user?.id));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
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
          cachePolicy="memory-disk"
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
