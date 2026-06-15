/**
 * Spacing / Radius / Shadow tokens — Figma 디자인에서 추출
 */

import { ViewStyle } from 'react-native';

// 간격 (Figma: gap-1 ~ gap-4, px/py 등)
export const spacing = {
  xs: 4, // gap-1, py-1
  sm: 6, // px-1.5, gap-1.5
  md: 8, // pl-2, rounded-lg 기준 패딩
  lg: 12, // px-3, gap-3
  xl: 16, // gap-4
  '2xl': 24, // status bar 패딩
} as const;

// 모서리 둥글기
export const radius = {
  sm: 4, // rounded-sm
  md: 6, // rounded-md
  lg: 8, // rounded-lg
  xl: 12, // rounded-xl
  screen: 40, // 화면 컨테이너 라운드
  full: 9999,
} as const;

// 테두리 두께
export const border = {
  thin: 1, // Stroke-1, Border
  thick: 2, // Stroke-2
} as const;

// 그림자 (Figma Box Shadow → RN elevation 매핑)
export const shadows = {
  // shadow-xs
  xs: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  // shadow-lg
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 8,
  } as ViewStyle,
} as const;
