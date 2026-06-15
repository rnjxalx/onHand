import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, textStyles } from '../theme';

export type CategoryType = 'fun' | 'important' | 'personal';

interface CategoryTagProps {
  type: CategoryType;
  label: string;
  style?: ViewStyle;
}

const BG: Record<CategoryType, string> = {
  fun: colors.categoryFun, // #D2F0FF
  important: colors.categoryImportant, // #FFD9D9
  personal: colors.categoryPersonal, // #FEE6C9
};

/**
 * CategoryTag — TODO / 관리항목 분류 태그
 * Figma 변수 fun / important / personal 색상 사용
 */
export function CategoryTag({ type, label, style }: CategoryTagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: BG[type] }, style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  label: {
    ...textStyles.xsRegular,
    color: colors.textPrimary,
  },
});
