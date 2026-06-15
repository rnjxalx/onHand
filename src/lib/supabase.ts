import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 (Expo/React Native).
 *
 * 환경변수로 주소/키를 주입한다 (.env 또는 셸):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * 키가 없으면 isSupabaseConfigured === false 이며, getSupabase() 호출 시 친절한 에러를 던진다.
 * (env 미설정 상태에서 import만 해도 앱이 크래시되지 않도록 지연 생성)
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = !!url && !!anonKey;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase 환경변수가 없습니다. EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // RN에는 URL 세션 콜백이 없으므로 비활성화
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
