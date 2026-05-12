// Drop-in replacement for the few `<Animated.View entering={FadeInDown.duration(N)}>`
// patterns we relied on from react-native-reanimated. RN's built-in Animated
// API has no declarative "entering" prop, so we synthesize it: start invisible
// and slightly offset, then run a parallel opacity+translate animation on mount.
// All animations use the native driver so they don't run on the JS thread.
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface FadeInOpts {
  delay?: number;
  duration?: number;
  /** initial translateY in dp (positive = slide up into place). */
  translateY?: number;
}

export interface FadeInValues {
  opacity: Animated.Value;
  translateY: Animated.Value;
  /** Convenience style object you can spread onto `<Animated.View>`. */
  style: {
    opacity: Animated.Value;
    transform: { translateY: Animated.Value }[];
  };
}

export function useFadeIn(opts: FadeInOpts = {}): FadeInValues {
  const { delay = 0, duration = 300, translateY = 18 } = opts;
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, offset, duration, delay]);

  return {
    opacity,
    translateY: offset,
    style: { opacity, transform: [{ translateY: offset }] },
  };
}
