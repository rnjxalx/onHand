/**
 * onHand 백엔드(FastAPI + ComfyUI) 접속 설정.
 *
 * 우선순위:
 *   1) 환경변수 EXPO_PUBLIC_API_BASE_URL (로컬/다른 서버로 바꿔 테스트할 때 사용)
 *   2) 기본값 — Cloudflare 터널 (외부망에서 서버의 FastAPI:10003 으로 연결)
 *
 * ⚠️ trycloudflare quick tunnel 주소는 터널을 재시작하면 바뀝니다.
 *    터널을 다시 열었다면 아래 DEFAULT_BASE_URL 을 새 주소로 바꾸거나,
 *    EXPO_PUBLIC_API_BASE_URL 환경변수로 덮어쓰세요.
 */
const DEFAULT_BASE_URL = 'https://region-designers-museums-edward.trycloudflare.com';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;

/** 서버가 생성해주는 감정 이미지 종류 (api/main.py 의 WORKFLOW_ORDER 와 동일). */
export const EMOTIONS = ['basic', 'happy', 'sad'] as const;
export type Emotion = (typeof EMOTIONS)[number];
