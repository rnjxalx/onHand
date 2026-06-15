import type { CategoryType } from '../components';

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: number;
}

export interface Session {
  userId: string;
  keepLoggedIn: boolean;
  loggedInAt: number;
}

/** ComfyUI 서버가 생성한 감정별 캐릭터 이미지(로컬 file:// 경로). */
export interface GeneratedCatImages {
  jobId: string;
  basic: string;
  happy: string;
  sad: string;
  createdAt: number;
}

export interface CatProfile {
  id: string;
  name: string;
  birthday: string;
  breed: string;
  gender: '남아' | '여아' | '';
  neutered: '했어요' | '안 했어요' | '';
  weight: string;
  vaccines: { label: string; done: boolean; date: string; skipped?: boolean }[];
  condition: string;
  photoUri: string | null;
  /** 원본 사진으로 만든 AI 캐릭터(없으면 아직 생성 전). */
  generated?: GeneratedCatImages | null;
  createdAt: number;
}

export interface TodoItem {
  id: string;
  label: string;
  done: boolean;
  createdAt: number;
  recurring?: boolean; // 고정 항목(설정에서 미리 등록)에서 올라온 To-do
  targetTime?: string; // 목표 시간 "HH:MM"(24h). 이 시간이 지나도 미완료면 고양이가 슬퍼짐
}

// To-do 리스트에 고정적으로 올라갈 항목 (설정에서 미리 등록)
export interface RecurringTodo {
  id: string;
  label: string;
}

export interface ManageItem {
  id: string;
  title: string;
  intervalDays: number;
  lastDoneAt: number;
  iconKey: 'claw' | 'shower' | 'brush' | 'custom';
}

export interface FeedItem {
  id: string;
  label: string;
  who: string;
  at: number;
}

export interface ChatMessage {
  id: string;
  who: string;
  mine: boolean;
  text: string;
  at: number;
}

export interface ScheduleItem {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  type: CategoryType;
  done: boolean;
  who: string; // 추가한 사람 이름
}

export interface Memory {
  id: string;
  photoUri: string | null;
  date: string;
  caption: string;
}

export interface WeightPoint {
  id: string;
  month: string;
  kg: number;
  at: number;
}
