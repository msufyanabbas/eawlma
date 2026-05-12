// Full-screen splash + brand spinner. Reanimated-free: uses RN's built-in
// `Animated` API. The boot splash pulses the logo box (scale + opacity); the
// inline `BrandSpinner` rotates a partial-stroke ring with native-driver
// interpolation. All driven by Animated.loop so we never round-trip the JS
// thread once the animation is started.
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONTS, SIZES } from '../theme';

export function LoadingScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logo, { transform: [{ scale: pulse }], opacity: pulse }]}>
        <Text style={styles.logoText}>ع</Text>
      </Animated.View>
      <Text style={styles.brand}>Eawlma</Text>
    </View>
  );
}

export function BrandSpinner({ size = 32 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: COLORS.primaryLight,
        borderTopColor: COLORS.primary,
        transform: [{ rotate }],
      }}
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
