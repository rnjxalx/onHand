import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, border } from '../theme';

interface CheckboxProps {
  checked: boolean;
  onToggle?: (next: boolean) => void;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Checkbox — Figma "체크 표시" (Property 1=true / false)
 * 20x20 기준
 */
export function Checkbox({
  checked,
  onToggle,
  size = 20,
  disabled = false,
  style,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onToggle?.(!checked)}
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: checked ? colors.primaryDark : colors.white,
          borderColor: checked ? colors.primaryDark : colors.slate200,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {checked && (
        <View
          style={[
            styles.check,
            { width: size * 0.5, height: size * 0.28 },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 체크마크 (회전한 ㄴ 모양)
  check: {
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
