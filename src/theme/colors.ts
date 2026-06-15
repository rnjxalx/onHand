/**
 * Color tokens — Figma 디자인에서 추출
 * 반려묘 케어 앱 (CatCare)
 */

export const colors = {
  // Brand (메인 주황 계열)
  primary: '#FDC34F', // Home 타이틀, 포인트
  primaryDark: '#F0AE29', // 활성 탭 아이콘/라벨, '외출' 라벨
  primaryDeep: '#FDC34F',

  // Category tags (TODO / 관리항목 분류색)
  categoryFun: '#D2F0FF', // 놀이/재미
  categoryImportant: '#FFD9D9', // 중요
  categoryPersonal: '#FEE6C9', // 개인

  // Text
  textPrimary: '#252525', // 기본 본문
  textSecondary: '#666666', // 비활성 탭 라벨, 보조 텍스트
  textMuted: '#64748B', // Slate 500

  // Neutral / Slate
  white: '#FFFFFF',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate800: '#1E293B',

  // Surface
  background: '#FFFFFF',
  border: '#E2E8F0',
} as const;

export type ColorToken = keyof typeof colors;
