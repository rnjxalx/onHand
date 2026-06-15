import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  hasSeenOnboarding: '@onhand/hasSeenOnboarding',
  permissionsAcked: '@onhand/permissionsAcked',
  accounts: '@onhand/accounts',
  session: '@onhand/session',
  cat: '@onhand/cat',
  todos: '@onhand/todos',
  recurringTodos: '@onhand/recurringTodos',
  manageItems: '@onhand/manageItems',
  feed: '@onhand/feed',
  schedules: '@onhand/schedules',
  chatMessages: '@onhand/chatMessages',
  memories: '@onhand/memories',
  weights: '@onhand/weights',
  notifications: '@onhand/notifications',
  inviteCode: '@onhand/inviteCode',
  activeHousehold: '@onhand/activeHousehold',
} as const;

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // 저장값이 'null' 로 들어가 있던 경우(JSON.parse → null)도 fallback 으로 보정
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures (e.g., quota) — UI state remains intact
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
