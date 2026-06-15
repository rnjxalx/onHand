/**
 * Theme — 통합 export
 * 사용: import { theme } from '@/theme';  →  theme.colors.primary
 */

import { colors } from './colors';
import { fontFamily, fontSize, textStyles } from './typography';
import { spacing, radius, border, shadows } from './spacing';

export const theme = {
  colors,
  fontFamily,
  fontSize,
  textStyles,
  spacing,
  radius,
  border,
  shadows,
} as const;

export { colors, fontFamily, fontSize, textStyles, spacing, radius, border, shadows };
export type Theme = typeof theme;
