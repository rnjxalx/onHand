/**
 * Typography tokens — Figma 디자인에서 추출
 * 기본 폰트: Inter — App.tsx 에서 @expo-google-fonts/inter 로 로드
 * (Regular=400 / Medium=500 / SemiBold=600 weight 매핑)
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
} as const;

export const fontSize = {
  xs: 12, // Text-xs
  sm: 14, // Text-sm
  base: 16,
  lg: 18, // 말풍선 보조 문구
  xl: 20,
  '2xl': 26, // 말풍선 강조 문구
  '3xl': 30, // 화면 타이틀(Home)
  tab: 10, // 탭 라벨
  tabSmall: 8, // '외출' 라벨
} as const;

/**
 * 사전 정의된 텍스트 스타일 (Figma variants 기반)
 */
export const textStyles = {
  // Text-xs / Regular
  xsRegular: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  // Text-sm / Regular
  smRegular: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  // Text-sm / Medium
  smMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  // 화면 타이틀
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 30,
    lineHeight: 45,
  } as TextStyle,

  // 말풍선 강조
  speechBubble: {
    fontFamily: fontFamily.semibold,
    fontSize: 26,
    lineHeight: 39,
  } as TextStyle,

  // 탭 라벨
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    lineHeight: 15,
  } as TextStyle,
} as const;
