import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { getSupabase } from './supabase';
import type {
  CatProfile,
  ChatMessage,
  FeedItem,
  GeneratedCatImages,
  ManageItem,
  Memory,
  ScheduleItem,
  TodoItem,
  WeightPoint,
} from '../store/types';

/**
 * Supabase 데이터 액세스 계층 (인증 + household/cat/todos).
 * 화면/스토어는 이 함수들만 호출하고, snake_case ↔ 앱 타입 매핑은 여기서 처리한다.
 */

// ── 매핑 헬퍼 ────────────────────────────────────────────────────────────────
function toMs(iso?: string | null): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

function mapCat(row: any): CatProfile {
  return {
    id: row.id,
    name: row.name ?? '',
    birthday: row.birthday ?? '',
    breed: row.breed ?? '',
    gender: row.gender ?? '',
    neutered: row.neutered ?? '',
    weight: row.weight ?? '',
    vaccines: Array.isArray(row.vaccines) ? row.vaccines : [],
    condition: row.condition ?? '',
    photoUri: row.photo_url ?? null,
    generated: (row.generated as GeneratedCatImages | null) ?? null,
    createdAt: toMs(row.created_at),
  };
}

function mapTodo(row: any): TodoItem {
  return {
    id: row.id,
    label: row.label,
    done: !!row.done,
    createdAt: toMs(row.created_at),
    recurring: !!row.recurring,
    targetTime: row.target_time ?? undefined,
  };
}

// ── 인증 ─────────────────────────────────────────────────────────────────────
export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

// ── 가족(household) ─────────────────────────────────────────────────────────
export async function getMyHouseholdId(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('household_members')
    .select('household_id')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.household_id ?? null;
}

/** 내가 속한 모든 가족 id (가입 시 자동 생성된 것 + 코드로 합류한 것) */
export async function getMyHouseholdIds(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('household_members')
    .select('household_id, joined_at')
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.household_id);
}

export async function createHousehold(): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_household');
  if (error) throw error;
  return data as string;
}

export async function joinHouseholdByCode(code: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('join_household_by_code', {
    code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}

export async function getInviteCode(householdId: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from('households')
    .select('invite_code')
    .eq('id', householdId)
    .single();
  if (error) throw error;
  return data.invite_code;
}

// ── 고양이 ───────────────────────────────────────────────────────────────────
export async function getCat(householdId: string): Promise<CatProfile | null> {
  const { data, error } = await getSupabase()
    .from('cats')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCat(data) : null;
}

type CatPatch = Partial<
  Pick<
    CatProfile,
    'name' | 'birthday' | 'breed' | 'gender' | 'neutered' | 'weight' | 'condition' | 'vaccines'
  >
> & { photoUri?: string | null; generated?: GeneratedCatImages | null };

function catPatchToRow(patch: CatPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const k of ['name', 'birthday', 'breed', 'gender', 'neutered', 'weight', 'condition', 'vaccines'] as const) {
    if (patch[k] !== undefined) row[k] = patch[k];
  }
  if (patch.photoUri !== undefined) row.photo_url = patch.photoUri;
  if (patch.generated !== undefined) row.generated = patch.generated;
  return row;
}

export async function createCat(householdId: string, patch: CatPatch): Promise<CatProfile> {
  const { data, error } = await getSupabase()
    .from('cats')
    .insert({ household_id: householdId, ...catPatchToRow(patch) })
    .select('*')
    .single();
  if (error) throw error;
  return mapCat(data);
}

export async function updateCat(id: string, patch: CatPatch): Promise<void> {
  const { error } = await getSupabase().from('cats').update(catPatchToRow(patch)).eq('id', id);
  if (error) throw error;
}

// ── 할 일 ────────────────────────────────────────────────────────────────────
export async function listTodos(householdId: string): Promise<TodoItem[]> {
  const { data, error } = await getSupabase()
    .from('todos')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTodo);
}

export async function addTodo(householdId: string, label: string, targetTime?: string): Promise<TodoItem> {
  const { data, error } = await getSupabase()
    .from('todos')
    .insert({ household_id: householdId, label: label.trim(), target_time: targetTime ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return mapTodo(data);
}

// 변경된 행이 0건이면(RLS/권한으로 조용히 무시된 경우) 에러를 던져 호출 측이 알 수 있게 함
function ensureAffected(data: unknown[] | null, op: string) {
  if (!data || data.length === 0) {
    throw new Error(`${op}: 변경 권한이 없거나 항목을 찾을 수 없어요 (가족 권한/RLS 확인).`);
  }
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  const { data, error } = await getSupabase().from('todos').update({ done }).eq('id', id).select('id');
  if (error) throw error;
  ensureAffected(data, 'todo 완료 변경');
}

export async function setTodoLabel(id: string, label: string): Promise<void> {
  const { data, error } = await getSupabase().from('todos').update({ label: label.trim() }).eq('id', id).select('id');
  if (error) throw error;
  ensureAffected(data, 'todo 이름 변경');
}

export async function setTodoTargetTime(id: string, targetTime?: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('todos')
    .update({ target_time: targetTime ?? null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  ensureAffected(data, 'todo 시간 변경');
}

export async function deleteTodo(id: string): Promise<void> {
  const { data, error } = await getSupabase().from('todos').delete().eq('id', id).select('id');
  if (error) throw error;
  ensureAffected(data, 'todo 삭제');
}

// ── 가족 채팅 ────────────────────────────────────────────────────────────────
function mapChat(row: any, currentUserId: string): ChatMessage {
  return {
    id: row.id,
    who: row.author ?? '',
    mine: row.user_id === currentUserId,
    text: row.text,
    at: toMs(row.created_at),
  };
}

export async function listChat(householdId: string, currentUserId: string): Promise<ChatMessage[]> {
  const { data, error } = await getSupabase()
    .from('chat_messages')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapChat(r, currentUserId));
}

export async function sendChatMessage(
  householdId: string,
  userId: string,
  author: string,
  text: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('chat_messages')
    .insert({ household_id: householdId, user_id: userId, author, text });
  if (error) throw error;
}

export async function deleteChatMessage(id: string): Promise<void> {
  const { error } = await getSupabase().from('chat_messages').delete().eq('id', id);
  if (error) throw error;
}

// ── 일정(캘린더) ─────────────────────────────────────────────────────────────
function mapSchedule(row: any): ScheduleItem {
  return { id: row.id, date: row.date, label: row.label, type: row.type, done: !!row.done, who: row.who ?? '' };
}

export async function listSchedules(householdId: string): Promise<ScheduleItem[]> {
  const { data, error } = await getSupabase()
    .from('schedules')
    .select('*')
    .eq('household_id', householdId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSchedule);
}

export async function addScheduleRow(
  householdId: string,
  input: { date: string; label: string; type: ScheduleItem['type']; who: string },
): Promise<ScheduleItem> {
  const { data, error } = await getSupabase()
    .from('schedules')
    .insert({ household_id: householdId, date: input.date, label: input.label, type: input.type, who: input.who })
    .select('*')
    .single();
  if (error) throw error;
  return mapSchedule(data);
}

export async function setScheduleDone(id: string, done: boolean): Promise<void> {
  const { error } = await getSupabase().from('schedules').update({ done }).eq('id', id);
  if (error) throw error;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await getSupabase().from('schedules').delete().eq('id', id);
  if (error) throw error;
}

// ── 활동 피드 ────────────────────────────────────────────────────────────────
function mapFeed(row: any): FeedItem {
  return { id: row.id, label: row.label, who: row.who ?? '', at: toMs(row.created_at) };
}

export async function listFeed(householdId: string): Promise<FeedItem[]> {
  const { data, error } = await getSupabase()
    .from('feed')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(mapFeed);
}

export async function addFeedRow(householdId: string, label: string, who: string): Promise<FeedItem> {
  const { data, error } = await getSupabase()
    .from('feed')
    .insert({ household_id: householdId, label, who })
    .select()
    .single();
  if (error) throw error;
  return mapFeed(data);
}

export async function deleteFeedRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('feed').delete().eq('id', id);
  if (error) throw error;
}

// ── 관리 항목 ────────────────────────────────────────────────────────────────
function mapManage(row: any): ManageItem {
  return {
    id: row.id,
    title: row.title,
    intervalDays: row.interval_days,
    lastDoneAt: Number(row.last_done_at) || 0,
    iconKey: row.icon_key,
  };
}

export async function listManageItems(householdId: string): Promise<ManageItem[]> {
  const { data, error } = await getSupabase()
    .from('manage_items')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapManage);
}

export async function addManageItemRow(
  householdId: string,
  input: { title: string; intervalDays: number; iconKey?: ManageItem['iconKey']; lastDoneAt?: number },
): Promise<ManageItem> {
  const { data, error } = await getSupabase()
    .from('manage_items')
    .insert({
      household_id: householdId,
      title: input.title,
      interval_days: input.intervalDays,
      icon_key: input.iconKey ?? 'custom',
      last_done_at: input.lastDoneAt ?? Date.now(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapManage(data);
}

export async function bumpManageItemRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('manage_items').update({ last_done_at: Date.now() }).eq('id', id);
  if (error) throw error;
}

export async function deleteManageItemRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('manage_items').delete().eq('id', id);
  if (error) throw error;
}

// ── 기록(추억) ───────────────────────────────────────────────────────────────
function mapMemory(row: any): Memory {
  return { id: row.id, photoUri: row.photo_url ?? null, date: row.date ?? '', caption: row.caption ?? '' };
}

export async function listMemories(householdId: string): Promise<Memory[]> {
  const { data, error } = await getSupabase()
    .from('memories')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapMemory);
}

export async function addMemoryRow(
  householdId: string,
  input: { photoUri: string | null; date: string; caption: string },
): Promise<Memory> {
  const { data, error } = await getSupabase()
    .from('memories')
    .insert({ household_id: householdId, photo_url: input.photoUri, date: input.date, caption: input.caption })
    .select('*')
    .single();
  if (error) throw error;
  return mapMemory(data);
}

export async function deleteMemoryRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('memories').delete().eq('id', id);
  if (error) throw error;
}

// ── 체중 기록 ────────────────────────────────────────────────────────────────
function mapWeight(row: any): WeightPoint {
  return { id: row.id, month: row.label ?? '', kg: row.kg, at: toMs(row.created_at) };
}

export async function listWeights(householdId: string): Promise<WeightPoint[]> {
  const { data, error } = await getSupabase()
    .from('weights')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWeight);
}

export async function addWeightRow(householdId: string, label: string, kg: number): Promise<WeightPoint> {
  const { data, error } = await getSupabase()
    .from('weights')
    .insert({ household_id: householdId, label, kg })
    .select('*')
    .single();
  if (error) throw error;
  return mapWeight(data);
}

// ── 이미지 Storage ───────────────────────────────────────────────────────────
const CAT_BUCKET = 'cat-images';

/** 로컬 file:// 이미지를 Storage 에 올리고 공개 URL 반환. 이미 http(s) URL 이면 그대로 반환. */
export async function uploadCatImage(localUri: string, path: string, contentType: string): Promise<string> {
  if (/^https?:\/\//.test(localUri)) return localUri;
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const sb = getSupabase();
  const { error } = await sb.storage
    .from(CAT_BUCKET)
    .upload(path, decodeBase64(base64), { contentType, upsert: true });
  if (error) throw error;
  return sb.storage.from(CAT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 공개 URL 로부터 Storage 객체 경로를 추출해 파일을 삭제. (로컬/외부 URL 이면 무시) */
export async function deleteCatImageByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${CAT_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // 이 버킷의 객체가 아님(로컬 file:// 등)
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  const { error } = await getSupabase().storage.from(CAT_BUCKET).remove([path]);
  if (error) throw error;
}
