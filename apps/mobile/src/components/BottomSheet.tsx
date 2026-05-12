// Lightweight bottom sheet built on RN's Modal + Reanimated. We deliberately
// don't pull in @gorhom/bottom-sheet — for filter / picker use-cases the
// dependency is too heavy and ships a second gesture-handler config. This
// supports open/close animation, swipe-down to dismiss, and a backdrop.
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, SHADOWS, SIZES } from '../theme';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Sheet height as a fraction of screen height (0..1). Default 0.6. */
  heightFraction?: number;
}

export function BottomSheet({ open, onClose, children, heightFraction = 0.6 }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * heightFraction);
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      backdropOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    } else {
      translateY.value = withTiming(sheetHeight, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [open, sheetHeight, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const drag = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.value = withTiming(sheetHeight, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={drag}>
        <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusXl,
    borderTopRightRadius: SIZES.borderRadiusXl,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.xxl,
    ...SHADOWS.lg,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SIZES.md,
  },
});
