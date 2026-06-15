import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface ToggleProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const TRACK_W = 40;
const TRACK_H = 20;
const KNOB = 16;
const PAD = 2;

/**
 * Toggle — Figma "Toggle" (state=on / state=off)
 * 40x20 트랙, 슬라이드 애니메이션 포함
 */
export function Toggle({ value, onValueChange, disabled = false, style }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const knobX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, TRACK_W - KNOB - PAD],
  });

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.slate200, colors.primaryDark],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange?.(!value)}
      style={style}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackColor as unknown as string, opacity: disabled ? 0.4 : 1 },
        ]}
      >
        <Animated.View style={[styles.knob, { transform: [{ translateX: knobX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.white,
  },
});
