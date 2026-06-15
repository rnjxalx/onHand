import type { TodoItem } from '../store/types';

/** 두 자리 0 패딩 ("9" → "09") */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** "HH:MM" → 자정 기준 분(minute). 형식이 틀리면 null */
export function parseHHMM(s?: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 시/분 → "HH:MM" */
export function formatHHMM(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** 특정 시각(ms)의 자정 기준 분 */
export function minutesOfDay(nowMs: number): number {
  const d = new Date(nowMs);
  return d.getHours() * 60 + d.getMinutes();
}

/** 목표 시간이 지났는데 아직 완료하지 않은 To-do 인지 */
export function isTodoOverdue(todo: TodoItem, nowMs: number): boolean {
  if (todo.done) return false;
  const target = parseHHMM(todo.targetTime);
  if (target === null) return false;
  return target <= minutesOfDay(nowMs);
}
