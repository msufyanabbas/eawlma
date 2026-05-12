// Full-screen splash while fonts + i18n bootstrap. Uses a simple pulsing
// brand mark instead of Lottie so we don't ship a 50KB JSON for the
// initial-paint case (Lottie is still available app-wide for in-app
// transitions; see `BrandSpinner` below).
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, FONTS, SIZES } from '../theme';

export function LoadingScreen() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: pulse.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logo, animatedStyle]}>
        <Text style={styles.logoText}>ع</Text>
      </Animated.View>
      <Text style={styles.brand}>Eawlma</Text>
    </View>
  );
}

export function BrandSpinner({ size = 32 }: { size?: number }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: COLORS.primaryLight,
          borderTopColor: COLORS.primary,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 56,
    color: COLORS.primary,
    fontFamily: FONTS.extraBold,
    lineHeight: 64,
  },
  brand: {
    marginTop: SIZES.xl,
    color: COLORS.white,
    fontSize: SIZES.subtitle,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
});
