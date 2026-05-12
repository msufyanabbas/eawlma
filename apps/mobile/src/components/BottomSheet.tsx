// Lightweight bottom sheet built on RN's Modal + Gesture Handler. No
// reanimated — translateY and backdrop opacity use RN's built-in `Animated`
// API with the native driver. We keep gesture-handler because it lets the
// user swipe the sheet down to dismiss; without it the sheet still works,
// you'd just lose that gesture.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // We need a JS-thread mirror of the current translateY because the pan
  // gesture runs on the JS thread (gesture-handler events come through
  // worklets but the result drives RN Animated.Value via .setValue()).
  const dragStartY = useRef(0);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, sheetHeight, translateY, backdropOpacity]);

  const drag = Gesture.Pan()
    .onStart(() => {
      // @ts-expect-error _value is not part of the public API but RN exposes
      // it on every Animated.Value; the alternative is a useState round-trip
      // which we'd rather avoid in a gesture handler.
      dragStartY.current = translateY._value as number;
    })
    .onUpdate((e) => {
      const next = Math.max(0, dragStartY.current + e.translationY);
      translateY.setValue(next);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onClose();
        });
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={drag}>
        <Animated.View
          style={[styles.sheet, { height: sheetHeight, transform: [{ translateY }] }]}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
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
