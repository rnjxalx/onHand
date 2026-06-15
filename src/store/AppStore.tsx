import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, Alert } from 'react-native';
import type { User, RealtimeChannel } from '@supabase/supabase-js';
import { StorageKeys, getItem, newId, removeItem, setItem } from './storage';
import { describeProgress, generateCatImages } from '../api';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import * as db from '../lib/db';
import { ensureNotificationSetup, syncPresetReminders, type PresetReminder } from '../lib/notifications';
import type {
  Account,
  CatProfile,
  ChatMessage,
  FeedItem,
  ManageItem,
  Memory,
  RecurringTodo,
  ScheduleItem,
  Session,
  TodoItem,
  WeightPoint,
} from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

const DEFAULT_VACCINES = [
  { label: '1차 접종 완료', done: false, date: '' },
  { label: '2차 접종 완료', done: false, date: '' },
  { label: '3차 접종 완료', done: false, date: '' },
];

const DEFAULT_MANAGE: ManageItem[] = [
  { id: 'm-claw', title: '발톱', intervalDays: 21, lastDoneAt: Date.now() - 17 * DAY_MS, iconKey: 'claw' },
  { id: 'm-shower', title: '샤워', intervalDays: 365, lastDoneAt: Date.now() - 114 * DAY_MS, iconKey: 'shower' },
  { id: 'm-brush', title: '빗질', intervalDays: 3, lastDoneAt: Date.now() - 1 * DAY_MS, iconKey: 'brush' },
];

const DEFAULT_NOTI = {
  darkMode: false,
  meal: true,
  water: true,
  play: true,
  litter: true,
  other: true, // 프리셋 외(밥/물/놀이/화장실 외) 목표 시간 있는 todo 30분 전 알림
};

export type NotificationSettings = typeof DEFAULT_NOTI;

/** 고정 To-do 프리셋 4종 — 라벨은 말풍선 키워드(밥/물/놀/화장실)와 알림 토글(meal/water/play/litter)에 매핑된다. */
export const TODO_PRESETS: { key: 'meal' | 'water' | 'play' | 'litter'; label: string }[] = [
  { key: 'meal', label: '밥 주기' },
  { key: 'water', label: '물 주기' },
  { key: 'play', label: '놀아주기' },
  { key: 'litter', label: '화장실 청소' },
];

const BUILTIN_PRESET_LABELS = new Set(TODO_PRESETS.map((p) => p.label));

/** AI 캐릭터 생성 진행 상태 (영구 저장하지 않는 휘발성 상태). */
export interface CatGenState {
  status: 'idle' | 'running' | 'done' | 'error';
  progress: number; // 완료된 이미지 수 (0..total)
  total: number;
  step: string; // 사용자에게 보여줄 현재 단계 문구
  error: string | null;
}

const IDLE_CAT_GEN: CatGenState = {
  status: 'idle',
  progress: 0,
  total: 3,
  step: '',
  error: null,
};

/** Supabase 인증 에러 메시지를 한국어로 변환 */
function friendlyAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/already registered|already been registered|user already/i.test(msg)) return '이미 가입된 이메일입니다.';
  if (/password should be at least/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.';
  if (/unable to validate email|invalid format|email/i.test(msg) && /invalid/i.test(msg))
    return '올바른 이메일을 입력해주세요.';
  return msg || '오류가 발생했어요. 다시 시도해주세요.';
}

interface AppState {
  ready: boolean;
  hasSeenOnboarding: boolean;
  permissionsAcked: boolean;
  accounts: Account[];
  session: Session | null;
  user: Account | null;
  cat: CatProfile | null;
  todos: TodoItem[];
  recurringTodos: RecurringTodo[];
  manageItems: ManageItem[];
  feed: FeedItem[];
  chat: ChatMessage[];
  schedules: ScheduleItem[];
  memories: Memory[];
  weights: WeightPoint[];
  notifications: NotificationSettings;
  inviteCode: string;
  catGen: CatGenState;

  // onboarding
  markOnboardingSeen: () => Promise<void>;
  markPermissionsAcked: () => Promise<void>;

  // auth (Supabase)
  signup: (input: { name: string; email: string; password: string; keepLoggedIn: boolean; inviteCode?: string }) =>
    Promise<{ ok: true; joined: boolean; joinError?: string } | { ok: false; error: string }>;
  login: (input: { email: string; password: string; keepLoggedIn: boolean }) =>
    Promise<{ ok: true; hasCat: boolean } | { ok: false; error: string }>;
  logout: () => Promise<void>;

  // 가족(household)
  joinHouseholdByCode: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  // cat
  saveCatBasic: (input: Pick<CatProfile, 'name' | 'birthday' | 'breed' | 'gender'>) => Promise<void>;
  saveCatDetail: (input: Pick<CatProfile, 'neutered' | 'weight' | 'vaccines' | 'condition'>) => Promise<void>;
  // 프로필 일부 필드만 부분 수정 (이름/성별/몸무게 등)
  updateCat: (patch: Partial<CatProfile>) => Promise<void>;
  setCatPhoto: (uri: string | null) => Promise<void>;
  // 사진을 서버로 보내 basic/happy/sad 캐릭터를 생성하고 cat.generated 에 저장
  generateCatCharacters: (photoUri: string) => Promise<void>;
  resetCatGen: () => void;

  // todos
  addTodo: (label: string, targetTime?: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  renameTodo: (id: string, label: string) => Promise<void>;
  setTodoTime: (id: string, targetTime?: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;

  // 고정 To-do 항목 (설정 메타데이터 — 로컬)
  addRecurringTodo: (label: string) => Promise<void>;
  removeRecurringTodo: (id: string) => Promise<void>;

  // 프리셋(밥/물/놀이/화장실)의 목표 시간 설정 — 라벨 기준 todo 를 만들거나 시간 변경/삭제
  setPresetTime: (label: string, time: string | null) => Promise<void>;

  // manage
  addManageItem: (input: { title: string; intervalDays: number }) => Promise<void>;
  bumpManageItem: (id: string) => Promise<void>;
  removeManageItem: (id: string) => Promise<void>;

  // chat
  sendChat: (text: string) => Promise<void>;
  removeChat: (id: string) => Promise<void>;

  // feed
  removeFeed: (id: string) => Promise<void>;

  // schedules
  addSchedule: (input: Omit<ScheduleItem, 'id' | 'done' | 'who'>) => Promise<void>;
  toggleSchedule: (id: string) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;

  // memories
  addMemory: (input: Omit<Memory, 'id'>) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;

  // weights
  addWeight: (kg: number) => Promise<void>;

  // notifications
  setNotification: (key: keyof NotificationSettings, value: boolean) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [permissionsAcked, setPermissionsAcked] = useState(false);
  // accounts 는 더 이상 로컬에 두지 않지만(인증은 Supabase), 일부 화면 호환용으로 빈 배열 유지
  const [accounts] = useState<Account[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [cat, setCat] = useState<CatProfile | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [recurringTodos, setRecurringTodos] = useState<RecurringTodo[]>([]);
  const [manageItems, setManageItems] = useState<ManageItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [weights, setWeights] = useState<WeightPoint[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTI);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [catGen, setCatGen] = useState<CatGenState>(IDLE_CAT_GEN);

  // Supabase 식별자 (콜백에서 최신값 참조용)
  const householdIdRef = useRef<string | null>(null);
  const catIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 콜백에서 항상 "현재" 목록을 읽기 위한 ref (setState 업데이터 부수효과로 값을 읽던 안티패턴 제거)
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;
  const manageItemsRef = useRef(manageItems);
  manageItemsRef.current = manageItems;
  const recurringTodosRef = useRef(recurringTodos);
  recurringTodosRef.current = recurringTodos;

  // 로컬 변경(낙관적 업데이트) 직후, 폴링/Realtime 재조회가 아직 커밋 안 된 서버 상태로
  // 덮어쓰지 않도록 잠깐 억제하는 창. 변경할 때마다 갱신한다.
  const syncSuppressRef = useRef(0);
  const markLocalChange = useCallback(() => {
    syncSuppressRef.current = Date.now() + 2500;
  }, []);
  const syncSuppressed = () => Date.now() < syncSuppressRef.current;

  // 쓰기 진행 중인 todo 변경을 id 별로 추적 → 재조회가 와도 이 값으로 덮어써서 되돌림 방지
  type TodoPatch = { done?: boolean; label?: string; targetTime?: string; clearTime?: boolean; deleted?: boolean };
  const pendingTodosRef = useRef<Map<string, TodoPatch>>(new Map());
  // 서버에서 받은 todo 목록에 보류 중 변경을 덮어씌워 적용
  const applyServerTodos = useCallback((server: TodoItem[]) => {
    const pend = pendingTodosRef.current;
    if (pend.size === 0) {
      setTodos(server);
      return;
    }
    setTodos(
      server
        .filter((t) => !pend.get(t.id)?.deleted)
        .map((t) => {
          const p = pend.get(t.id);
          if (!p) return t;
          return {
            ...t,
            ...(p.done !== undefined ? { done: p.done } : {}),
            ...(p.label !== undefined ? { label: p.label } : {}),
            ...(p.clearTime ? { targetTime: undefined } : p.targetTime !== undefined ? { targetTime: p.targetTime } : {}),
          };
        }),
    );
  }, []);
  // 쓰기 완료 후 잠시 뒤 보류 항목 제거 (그 사이 더 최신 변경이 있으면 유지)
  const clearPendingTodo = useCallback((id: string, expected: TodoPatch) => {
    setTimeout(() => {
      if (pendingTodosRef.current.get(id) === expected) pendingTodosRef.current.delete(id);
    }, 1500);
  }, []);

  // 가족 데이터 변경을 실시간으로 받아 공동 동기화 (Realtime). 발생 시 해당 가족 데이터 재조회.
  const subscribeRealtime = useCallback(async (hid: string) => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (channelRef.current) {
      sb.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // RLS 기반 postgres_changes 를 받으려면 realtime 소켓에 사용자 JWT 를 설정해야 함
    try {
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) sb.realtime.setAuth(data.session.access_token);
    } catch (e) { console.error(e); }

    // 로컬 변경 직후에는 재조회 적용을 건너뛴다(낙관적 상태 보호)
    const refetchTodos = async () => { try { applyServerTodos(await db.listTodos(hid)); } catch (e) { console.error(e); } };
    const refetchCat = async () => {
      if (syncSuppressed()) return;
      try { const c = await db.getCat(hid); catIdRef.current = c?.id ?? null; setCat(c); } catch (e) { console.error(e); }
    };
    const refetchChat = async () => { if (syncSuppressed()) return; try { setChat(await db.listChat(hid, userIdRef.current ?? '')); } catch (e) { console.error(e); } };
    const refetchSchedules = async () => { if (syncSuppressed()) return; try { setSchedules(await db.listSchedules(hid)); } catch (e) { console.error(e); } };
    const refetchFeed = async () => { if (syncSuppressed()) return; try { setFeed(await db.listFeed(hid)); } catch (e) { console.error(e); } };
    const refetchManage = async () => { if (syncSuppressed()) return; try { setManageItems(await db.listManageItems(hid)); } catch (e) { console.error(e); } };
    const refetchMemories = async () => { if (syncSuppressed()) return; try { setMemories(await db.listMemories(hid)); } catch (e) { console.error(e); } };
    const refetchWeights = async () => { if (syncSuppressed()) return; try { setWeights(await db.listWeights(hid)); } catch (e) { console.error(e); } };

    const f = `household_id=eq.${hid}`;
    channelRef.current = sb
      .channel(`household-${hid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: f }, refetchTodos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cats', filter: f }, refetchCat)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: f }, refetchChat)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: f }, refetchSchedules)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed', filter: f }, refetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manage_items', filter: f }, refetchManage)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: f }, refetchMemories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weights', filter: f }, refetchWeights)
      .subscribe();
  }, []);

  const unsubscribeRealtime = useCallback(() => {
    if (channelRef.current && isSupabaseConfigured) {
      getSupabase().removeChannel(channelRef.current);
    }
    channelRef.current = null;
  }, []);

  // ── 가족/데이터 부트스트랩 ────────────────────────────────────────────────
  // 활성 가족 결정: 저장된 active(코드로 합류한 가족 등)를 우선, 없으면 첫 멤버십, 그것도 없으면 새로 생성
  const ensureHousehold = useCallback(async (): Promise<string> => {
    if (householdIdRef.current) return householdIdRef.current;
    const ids = await db.getMyHouseholdIds();
    const stored = await getItem<string | null>(StorageKeys.activeHousehold, null);
    let hid = stored && ids.includes(stored) ? stored : ids[0] ?? null;
    if (!hid) {
      hid = await db.createHousehold();
      for (const m of DEFAULT_MANAGE) {
        await db.addManageItemRow(hid, { title: m.title, intervalDays: m.intervalDays, iconKey: m.iconKey, lastDoneAt: m.lastDoneAt });
      }
    }
    householdIdRef.current = hid;
    await setItem(StorageKeys.activeHousehold, hid);
    return hid;
  }, []);

  const setAuthUser = useCallback((u: User) => {
    userIdRef.current = u.id;
    setSession({ userId: u.id, keepLoggedIn: true, loggedInAt: Date.now() });
    setUser({
      id: u.id,
      name: (u.user_metadata?.name as string) ?? '',
      email: u.email ?? '',
      password: '',
      createdAt: 0,
    });
  }, []);

  /** 특정 가족(household)의 고양이/할일/채팅/초대코드 로드 + 활성 가족 고정 + 실시간 구독. */
  const loadScope = useCallback(async (hid: string): Promise<boolean> => {
    householdIdRef.current = hid;
    await setItem(StorageKeys.activeHousehold, hid);
    const uid = userIdRef.current ?? '';
    // 핵심 데이터(고양이/할일/초대코드)는 함께 로드
    const [c, ts, code] = await Promise.all([db.getCat(hid), db.listTodos(hid), db.getInviteCode(hid)]);
    catIdRef.current = c?.id ?? null;
    setCat(c);
    setTodos(ts);
    setInviteCode(code);
    // 보조 데이터(채팅/일정/피드)는 각각 실패해도 핵심 로드를 막지 않음
    try { setChat(await db.listChat(hid, uid)); } catch (e) { console.error('[AppStore] 채팅 로드 실패:', e); }
    try { setSchedules(await db.listSchedules(hid)); } catch (e) { console.error('[AppStore] 일정 로드 실패:', e); }
    try { setFeed(await db.listFeed(hid)); } catch (e) { console.error('[AppStore] 피드 로드 실패:', e); }
    try { setManageItems(await db.listManageItems(hid)); } catch (e) { console.error('[AppStore] 관리 로드 실패:', e); }
    try { setMemories(await db.listMemories(hid)); } catch (e) { console.error('[AppStore] 기록 로드 실패:', e); }
    try { setWeights(await db.listWeights(hid)); } catch (e) { console.error('[AppStore] 체중 로드 실패:', e); }
    subscribeRealtime(hid);
    return !!c;
  }, [subscribeRealtime]);

  /** 로그인된 유저로 세션/가족/고양이/할일 로드. 고양이 존재 여부 반환. */
  const applySignedIn = useCallback(async (u: User): Promise<boolean> => {
    setAuthUser(u);
    try {
      const hid = await ensureHousehold();
      return await loadScope(hid);
    } catch (e) {
      console.error('[AppStore] bootstrap 실패:', e);
      return false;
    }
  }, [setAuthUser, ensureHousehold, loadScope]);

  const applySignedOut = useCallback(() => {
    unsubscribeRealtime();
    householdIdRef.current = null;
    catIdRef.current = null;
    userIdRef.current = null;
    removeItem(StorageKeys.activeHousehold);
    setSession(null);
    setUser(null);
    setCat(null);
    setTodos([]);
    setChat([]);
    setSchedules([]);
    setFeed([]);
    setManageItems([]);
    setMemories([]);
    setWeights([]);
    setInviteCode('');
    setCatGen(IDLE_CAT_GEN);
  }, [unsubscribeRealtime]);

  // 초기 로드 — 로컬(설정/관리/채팅 등) + Supabase 세션 복원
  useEffect(() => {
    let cancelled = false;
    const sb = isSupabaseConfigured ? getSupabase() : null;

    (async () => {
      try {
        const [seenOnboarding, permsAcked, loadedRecurring, loadedNoti] =
          await Promise.all([
            getItem<boolean>(StorageKeys.hasSeenOnboarding, false),
            getItem<boolean>(StorageKeys.permissionsAcked, false),
            getItem<RecurringTodo[]>(StorageKeys.recurringTodos, []),
            getItem<NotificationSettings>(StorageKeys.notifications, DEFAULT_NOTI),
          ]);
        if (cancelled) return;
        setHasSeenOnboarding(seenOnboarding);
        setPermissionsAcked(permsAcked);
        setRecurringTodos(loadedRecurring);
        // 채팅/일정/피드/관리/기록/체중은 Supabase 에서 loadScope 로 로드 (가족 공유)
        // 신규 키(other 등)가 없는 과거 저장본도 기본값과 병합해 누락 방지
        setNotifications({ ...DEFAULT_NOTI, ...loadedNoti });

        // Supabase 세션 복원
        if (sb) {
          const { data } = await sb.auth.getSession();
          if (!cancelled && data.session?.user) {
            await applySignedIn(data.session.user);
          }
        }
      } catch (e) {
        console.error('[AppStore] 초기화 오류:', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    // 로그아웃만 리스너에서 처리 (로그인/가입 부트스트랩은 login/signup 에서 직접 수행 → 중복 방지)
    const sub = sb?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') applySignedOut();
    });

    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
      unsubscribeRealtime();
    };
  }, [applySignedIn, applySignedOut, unsubscribeRealtime]);

  // 활성 가족 데이터를 다시 불러와 공동 변경분을 반영 (Realtime 설정과 무관하게 동작하는 동기화)
  const refetchScope = useCallback(() => {
    const hid = householdIdRef.current;
    if (!hid) return;
    // todos 는 보류 병합으로 항상 안전하게 반영
    db.listTodos(hid).then(applyServerTodos).catch(() => {});
    // 나머지는 로컬 변경 직후 잠깐 건너뜀(되돌림 방지)
    if (syncSuppressed()) return;
    db.listChat(hid, userIdRef.current ?? '').then(setChat).catch(() => {});
    db.listSchedules(hid).then(setSchedules).catch(() => {});
    db.listFeed(hid).then(setFeed).catch(() => {});
    db.listManageItems(hid).then(setManageItems).catch(() => {});
    db.listMemories(hid).then(setMemories).catch(() => {});
    db.listWeights(hid).then(setWeights).catch(() => {});
    db.getCat(hid)
      .then((c) => {
        catIdRef.current = c?.id ?? null;
        setCat(c);
      })
      .catch(() => {});
  }, [applyServerTodos]);

  // 1) 포그라운드 복귀 시 즉시 동기화
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') refetchScope();
    });
    return () => sub.remove();
  }, [refetchScope]);

  // 2) 앱이 켜져 있는 동안 주기적으로(10초) 전체 동기화 — 가족 공동 변경분 반영
  useEffect(() => {
    const id = setInterval(() => {
      if (RNAppState.currentState === 'active') refetchScope();
    }, 10_000);
    return () => clearInterval(id);
  }, [refetchScope]);

  // 3) todos 는 가족이 자주 체크/해제하므로 더 자주(3초) 최신 상태로 동기화
  //    (applyServerTodos: 내 진행 중 변경은 보호 + 가장 최근 서버값으로 수렴 = last-write-wins)
  useEffect(() => {
    const id = setInterval(() => {
      if (RNAppState.currentState !== 'active') return;
      const hid = householdIdRef.current;
      if (!hid) return;
      db.listTodos(hid).then(applyServerTodos).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [applyServerTodos]);

  // 프리셋 목표 시간/알림 토글이 바뀔 때만 로컬 알림(목표 30분 전)을 재예약
  const presetLabelSet = new Set(TODO_PRESETS.map((p) => p.label));
  const reminderKey = [
    ...TODO_PRESETS.map((p) => {
      const todo = todos.find((t) => t.label === p.label);
      return `${p.key}:${notifications[p.key] ? todo?.targetTime ?? '' : 'off'}`;
    }),
    // 기타 알림: 프리셋이 아닌, 목표 시간이 설정된 todo들
    `other:${
      notifications.other
        ? todos
            .filter((t) => !presetLabelSet.has(t.label) && t.targetTime)
            .map((t) => `${t.id}@${t.targetTime}`)
            .join(',')
        : 'off'
    }`,
  ].join('|');
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const reminders: PresetReminder[] = [];
      for (const p of TODO_PRESETS) {
        if (!notifications[p.key]) continue;
        const todo = todos.find((t) => t.label === p.label);
        if (todo?.targetTime) reminders.push({ label: p.label, time: todo.targetTime });
      }
      // 기타 알림: 프리셋 외 목표 시간이 있는 todo도 30분 전 알림
      if (notifications.other) {
        for (const t of todos) {
          if (presetLabelSet.has(t.label) || !t.targetTime) continue;
          reminders.push({ label: t.label, time: t.targetTime });
        }
      }
      // 예약할 게 없으면 권한 요청 없이 기존 예약만 정리
      if (reminders.length === 0) {
        await syncPresetReminders([]);
        return;
      }
      const granted = await ensureNotificationSetup(); // 실제 예약이 있을 때만 권한 요청
      if (!granted) return;
      await syncPresetReminders(reminders);
    })();
  }, [ready, reminderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // persist on change (로컬 전용 항목만)
  useEffect(() => { if (ready) setItem(StorageKeys.recurringTodos, recurringTodos); }, [ready, recurringTodos]);

  // 고정 프리셋(기본 4종 + 커스텀) → To-do 리스트 동기화
  const syncPresetTodos = useCallback(async () => {
    const hid = householdIdRef.current;
    if (!hid) return;
    const labels = [
      ...TODO_PRESETS.map((p) => p.label),
      ...recurringTodosRef.current.map((r) => r.label),
    ];
    for (const label of labels) {
      if (todosRef.current.some((t) => t.label === label)) continue;
      markLocalChange();
      try {
        const created = await db.addTodo(hid, label);
        setTodos((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
      } catch (e) {
        console.error('[AppStore] syncPresetTodos 오류:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!ready || !session?.userId) return;
    syncPresetTodos();
  }, [ready, session?.userId, recurringTodos, syncPresetTodos]);
  useEffect(() => { if (ready) setItem(StorageKeys.notifications, notifications); }, [ready, notifications]);

  const markOnboardingSeen = useCallback(async () => {
    setHasSeenOnboarding(true);
    await setItem(StorageKeys.hasSeenOnboarding, true);
  }, []);

  const markPermissionsAcked = useCallback(async () => {
    setPermissionsAcked(true);
    await setItem(StorageKeys.permissionsAcked, true);
  }, []);

  // ── 인증 ────────────────────────────────────────────────────────────────────
  const signup: AppState['signup'] = useCallback(
    async ({ name, email, password, inviteCode }) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const code = inviteCode?.trim().toUpperCase() ?? '';
      if (!cleanName) return { ok: false, error: '이름을 입력해주세요.' };
      if (!/^.+@.+\..+$/.test(cleanEmail)) return { ok: false, error: '올바른 이메일을 입력해주세요.' };
      if (password.length < 6) return { ok: false, error: '비밀번호는 6자 이상이어야 합니다.' };
      try {
        const data = await db.signUp(cleanName, cleanEmail, password);
        if (!data.user) return { ok: true, joined: false }; // 자동확인 꺼진 경우 등
        setAuthUser(data.user);

        // 초대 코드가 있으면 그 가족으로 합류, 없으면 새 가족 생성
        if (code) {
          try {
            const hid = await db.joinHouseholdByCode(code);
            await loadScope(hid);
            return { ok: true, joined: true };
          } catch {
            // 코드가 틀리면 막히지 않도록 새 가족으로 시작
            const hid = await ensureHousehold();
            await loadScope(hid);
            return { ok: true, joined: false, joinError: '초대 코드가 올바르지 않아 새 가족으로 시작했어요.' };
          }
        }
        const hid = await ensureHousehold();
        await loadScope(hid);
        return { ok: true, joined: false };
      } catch (e) {
        return { ok: false, error: friendlyAuthError(e) };
      }
    },
    [setAuthUser, ensureHousehold, loadScope],
  );

  const login: AppState['login'] = useCallback(
    async ({ email, password }) => {
      try {
        const data = await db.signIn(email, password);
        const hasCat = data.user ? await applySignedIn(data.user) : false;
        return { ok: true, hasCat };
      } catch (e) {
        return { ok: false, error: friendlyAuthError(e) };
      }
    },
    [applySignedIn],
  );

  const logout = useCallback(async () => {
    try {
      await db.signOut();
    } catch (e) {
      console.error('[AppStore] logout 오류:', e);
    }
    applySignedOut();
  }, [applySignedOut]);

  const joinHouseholdByCode: AppState['joinHouseholdByCode'] = useCallback(async (code) => {
    try {
      const hid = await db.joinHouseholdByCode(code);
      await loadScope(hid);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '초대 코드가 올바르지 않아요.' };
    }
  }, [loadScope]);

  // ── 고양이 ───────────────────────────────────────────────────────────────────
  // 로컬 이미지를 Storage 에 올려 공개 URL 반환. 실패하면 로컬 uri 유지(이 기기에서는 표시됨).
  const uploadOrLocal = useCallback(
    async (hid: string, uri: string, name: string, contentType: string): Promise<string> => {
      try {
        return await db.uploadCatImage(uri, `${hid}/${Date.now()}-${name}`, contentType);
      } catch (e) {
        console.error('[AppStore] 이미지 업로드 실패(로컬 사용):', e);
        return uri;
      }
    },
    [],
  );

  const saveCatBasic: AppState['saveCatBasic'] = useCallback(async (input) => {
    markLocalChange();
    const hid = await ensureHousehold();
    if (catIdRef.current) {
      setCat((prev) => (prev ? { ...prev, ...input } : prev));
      await db.updateCat(catIdRef.current, input);
    } else {
      const created = await db.createCat(hid, { ...input, vaccines: DEFAULT_VACCINES });
      catIdRef.current = created.id;
      setCat(created);
    }
  }, [ensureHousehold]);

  const saveCatDetail: AppState['saveCatDetail'] = useCallback(async (input) => {
    markLocalChange();
    const hid = await ensureHousehold();
    if (catIdRef.current) {
      setCat((prev) => (prev ? { ...prev, ...input } : prev));
      await db.updateCat(catIdRef.current, input);
    } else {
      const created = await db.createCat(hid, input);
      catIdRef.current = created.id;
      setCat(created);
    }
  }, [ensureHousehold]);

  const updateCat: AppState['updateCat'] = useCallback(async (patch) => {
    markLocalChange();
    setCat((prev) => (prev ? { ...prev, ...patch } : prev));
    if (catIdRef.current) await db.updateCat(catIdRef.current, patch);
  }, []);

  const setCatPhoto: AppState['setCatPhoto'] = useCallback(async (uri) => {
    // 새 사진을 고르면 기존 AI 캐릭터는 더 이상 맞지 않으므로 초기화
    markLocalChange();
    setCatGen(IDLE_CAT_GEN);
    const hid = await ensureHousehold();
    // 로컬 미리보기 즉시 반영 후, Storage 업로드 → 공개 URL 로 교체(가족 공유)
    setCat((prev) => (prev ? { ...prev, photoUri: uri, generated: null } : prev));
    const url = uri ? await uploadOrLocal(hid, uri, 'photo.jpg', 'image/jpeg') : null;
    if (catIdRef.current) {
      setCat((prev) => (prev ? { ...prev, photoUri: url, generated: null } : prev));
      await db.updateCat(catIdRef.current, { photoUri: url, generated: null });
    } else {
      const created = await db.createCat(hid, { photoUri: url });
      catIdRef.current = created.id;
      setCat(created);
    }
  }, [ensureHousehold, uploadOrLocal]);

  const resetCatGen = useCallback(() => setCatGen(IDLE_CAT_GEN), []);

  const generateCatCharacters: AppState['generateCatCharacters'] = useCallback(
    async (photoUri) => {
      if (!photoUri) return;
      setCatGen({ status: 'running', progress: 0, total: 3, step: '사진 업로드 중...', error: null });
      try {
        const { jobId, images } = await generateCatImages(photoUri, (p) => {
          setCatGen({ status: 'running', progress: p.progress, total: p.total, step: describeProgress(p), error: null });
        });
        // 생성된 3종 이미지를 Storage 에 업로드해 가족이 공유할 수 있는 URL 로 저장
        setCatGen({ status: 'running', progress: 3, total: 3, step: '캐릭터 저장 중...', error: null });
        const hid = await ensureHousehold();
        const [basic, happy, sad] = await Promise.all([
          uploadOrLocal(hid, images.basic, `${jobId}-basic.png`, 'image/png'),
          uploadOrLocal(hid, images.happy, `${jobId}-happy.png`, 'image/png'),
          uploadOrLocal(hid, images.sad, `${jobId}-sad.png`, 'image/png'),
        ]);
        const generated = { jobId, basic, happy, sad, createdAt: Date.now() };
        markLocalChange();
        if (catIdRef.current) {
          setCat((prev) => (prev ? { ...prev, generated } : prev));
          await db.updateCat(catIdRef.current, { generated });
        } else {
          const photoUrl = await uploadOrLocal(hid, photoUri, 'photo.jpg', 'image/jpeg');
          const created = await db.createCat(hid, { photoUri: photoUrl, generated });
          catIdRef.current = created.id;
          setCat(created);
        }
        setCatGen({ status: 'done', progress: 3, total: 3, step: '완료!', error: null });
      } catch (e) {
        setCatGen({
          status: 'error',
          progress: 0,
          total: 3,
          step: '',
          error: e instanceof Error ? e.message : '캐릭터 생성에 실패했어요.',
        });
      }
    },
    [ensureHousehold, uploadOrLocal],
  );

  // ── 활동 피드 (Supabase) ─────────────────────────────────────────────────────
  const pushFeed = useCallback((label: string, who: string) => {
    markLocalChange();
    const optimisticId = newId();
    const at = Date.now();
    setFeed((prev) => [{ id: optimisticId, label, who, at }, ...prev].slice(0, 20));
    const hid = householdIdRef.current;
    if (hid) {
      db.addFeedRow(hid, label, who)
        .then((created) => {
          setFeed((prev) => prev.map((f) => (f.id === optimisticId ? created : f)).slice(0, 20));
        })
        .catch((e) => console.error('[AppStore] pushFeed 오류:', e));
    }
  }, []);

  const removeFeed: AppState['removeFeed'] = useCallback(async (id) => {
    markLocalChange();
    setFeed((prev) => prev.filter((f) => f.id !== id));
    if (!UUID_RE.test(id)) return;
    try {
      await db.deleteFeedRow(id);
    } catch (e) {
      console.error('[AppStore] removeFeed 오류:', e);
    }
  }, []);

  // ── 할 일 (Supabase) ─────────────────────────────────────────────────────────
  const addTodo: AppState['addTodo'] = useCallback(async (label, targetTime) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    markLocalChange();
    try {
      const hid = await ensureHousehold();
      const created = await db.addTodo(hid, trimmed, targetTime);
      setTodos((prev) => [...prev, created]);
    } catch (e) {
      console.error('[AppStore] addTodo 오류:', e);
    }
  }, [ensureHousehold]);

  const toggleTodo: AppState['toggleTodo'] = useCallback(
    async (id) => {
      // 현재 상태를 ref 로 안정적으로 읽는다 (업데이터 부수효과 X)
      const current = todosRef.current.find((t) => t.id === id);
      if (!current) return;
      const nextDone = !current.done;
      const label = current.label;
      markLocalChange();
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
      const patch: TodoPatch = { done: nextDone };
      pendingTodosRef.current.set(id, patch);
      if (nextDone && label) pushFeed(`${label} 완료`, user?.name || '나');
      try {
        await db.setTodoDone(id, nextDone);
        clearPendingTodo(id, patch); // 성공 → 잠시 뒤 보류 해제(이후 서버와 정합)
      } catch (e) {
        // 저장 실패: 조용히 되돌리지 말고 명확히 알린다 (원인 = DB 쓰기 실패)
        console.error('[AppStore] toggleTodo 오류:', e);
        pendingTodosRef.current.delete(id);
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nextDone } : t)));
        Alert.alert('저장 실패', '할 일 상태를 저장하지 못했어요.\n네트워크/로그인 상태를 확인하고 다시 시도해주세요.');
      }
    },
    [pushFeed, user?.name, clearPendingTodo],
  );

  const setTodoTime: AppState['setTodoTime'] = useCallback(async (id, targetTime) => {
    markLocalChange();
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, targetTime: targetTime || undefined } : t)));
    const patch: TodoPatch = targetTime ? { targetTime } : { clearTime: true };
    pendingTodosRef.current.set(id, patch);
    try {
      await db.setTodoTargetTime(id, targetTime);
    } catch (e) {
      console.error('[AppStore] setTodoTime 오류:', e);
    } finally {
      clearPendingTodo(id, patch);
    }
  }, [clearPendingTodo]);

  const renameTodo: AppState['renameTodo'] = useCallback(async (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    markLocalChange();
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, label: trimmed } : t)));
    const patch: TodoPatch = { label: trimmed };
    pendingTodosRef.current.set(id, patch);
    try {
      await db.setTodoLabel(id, trimmed);
    } catch (e) {
      console.error('[AppStore] renameTodo 오류:', e);
    } finally {
      clearPendingTodo(id, patch);
    }
  }, [clearPendingTodo]);

  const removeTodo: AppState['removeTodo'] = useCallback(async (id) => {
    markLocalChange();
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const patch: TodoPatch = { deleted: true };
    pendingTodosRef.current.set(id, patch);
    try {
      await db.deleteTodo(id);
    } catch (e) {
      console.error('[AppStore] removeTodo 오류:', e);
    } finally {
      clearPendingTodo(id, patch);
    }
  }, [clearPendingTodo]);

  // 고정 To-do — 설정 화면용 로컬 메타데이터 (기본 4종 외 커스텀 프리셋)
  const addRecurringTodo: AppState['addRecurringTodo'] = useCallback(async (label) => {
    const trimmed = label.trim();
    if (!trimmed || BUILTIN_PRESET_LABELS.has(trimmed)) return;
    if (recurringTodosRef.current.some((r) => r.label === trimmed)) return;
    setRecurringTodos((prev) => [...prev, { id: newId(), label: trimmed }]);
    if (!todosRef.current.some((t) => t.label === trimmed)) await addTodo(trimmed);
  }, [addTodo]);

  const removeRecurringTodo: AppState['removeRecurringTodo'] = useCallback(
    async (id) => {
      let label: string | undefined;
      setRecurringTodos((prev) => {
        label = prev.find((r) => r.id === id)?.label;
        return prev.filter((r) => r.id !== id);
      });
      if (label) {
        const existing = todosRef.current.find((t) => t.label === label);
        if (existing) await removeTodo(existing.id);
      }
    },
    [removeTodo],
  );

  // 프리셋 todo: 시간 설정/해제. 해제 시 항목은 유지하고 목표 시간만 지운다.
  const setPresetTime: AppState['setPresetTime'] = useCallback(
    async (label, time) => {
      const existing = todosRef.current.find((t) => t.label === label);
      if (existing) {
        if (time) await setTodoTime(existing.id, time);
        else await setTodoTime(existing.id, undefined);
      } else {
        await addTodo(label, time ?? undefined);
      }
    },
    [addTodo, setTodoTime],
  );

  // ── 관리/채팅/일정/메모리/체중/알림 (로컬) ──────────────────────────────────
  const addManageItem: AppState['addManageItem'] = useCallback(async ({ title, intervalDays }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    markLocalChange();
    try {
      const hid = await ensureHousehold();
      const created = await db.addManageItemRow(hid, {
        title: trimmed,
        intervalDays: Math.max(1, intervalDays),
        iconKey: 'custom',
        lastDoneAt: Date.now(),
      });
      setManageItems((prev) => [...prev, created]);
    } catch (e) {
      console.error('[AppStore] addManageItem 오류:', e);
    }
  }, [ensureHousehold]);

  const bumpManageItem: AppState['bumpManageItem'] = useCallback(
    async (id) => {
      const current = manageItemsRef.current.find((m) => m.id === id);
      markLocalChange();
      setManageItems((prev) => prev.map((m) => (m.id === id ? { ...m, lastDoneAt: Date.now() } : m)));
      if (current?.title) pushFeed(`${current.title} 완료`, user?.name || '나');
      try {
        await db.bumpManageItemRow(id);
      } catch (e) {
        console.error('[AppStore] bumpManageItem 오류:', e);
      }
    },
    [pushFeed, user?.name],
  );

  const removeManageItem: AppState['removeManageItem'] = useCallback(async (id) => {
    markLocalChange();
    setManageItems((prev) => prev.filter((m) => m.id !== id));
    try {
      await db.deleteManageItemRow(id);
    } catch (e) {
      console.error('[AppStore] removeManageItem 오류:', e);
    }
  }, []);

  const sendChat: AppState['sendChat'] = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const author = user?.name || '나';
      markLocalChange();
      // 낙관적 표시 (실시간/포그라운드 재조회로 서버 데이터와 동기화)
      setChat((prev) => [...prev, { id: newId(), who: author, mine: true, text: trimmed, at: Date.now() }]);
      try {
        const hid = await ensureHousehold();
        if (userIdRef.current) await db.sendChatMessage(hid, userIdRef.current, author, trimmed);
      } catch (e) {
        console.error('[AppStore] sendChat 오류:', e);
      }
    },
    [user?.name, ensureHousehold],
  );

  const removeChat: AppState['removeChat'] = useCallback(async (id) => {
    markLocalChange();
    // 내가 보낸 메시지만 삭제 가능
    setChat((prev) => prev.filter((m) => !(m.id === id && m.mine)));
    try {
      await db.deleteChatMessage(id);
    } catch (e) {
      console.error('[AppStore] removeChat 오류:', e);
    }
  }, []);

  const addSchedule: AppState['addSchedule'] = useCallback(async (input) => {
    if (!input.label.trim()) return;
    markLocalChange();
    try {
      const hid = await ensureHousehold();
      const created = await db.addScheduleRow(hid, {
        date: input.date,
        label: input.label.trim(),
        type: input.type,
        who: user?.name || '나',
      });
      setSchedules((prev) => [...prev, created]);
    } catch (e) {
      console.error('[AppStore] addSchedule 오류:', e);
    }
  }, [ensureHousehold, user?.name]);

  const toggleSchedule: AppState['toggleSchedule'] = useCallback(async (id) => {
    const current = schedulesRef.current.find((s) => s.id === id);
    if (!current) return;
    const next = !current.done;
    markLocalChange();
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, done: next } : s)));
    try {
      await db.setScheduleDone(id, next);
    } catch (e) {
      console.error('[AppStore] toggleSchedule 오류:', e);
    }
  }, []);

  const removeSchedule: AppState['removeSchedule'] = useCallback(async (id) => {
    markLocalChange();
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    try {
      await db.deleteSchedule(id);
    } catch (e) {
      console.error('[AppStore] removeSchedule 오류:', e);
    }
  }, []);

  const addMemory: AppState['addMemory'] = useCallback(async (input) => {
    markLocalChange();
    try {
      const hid = await ensureHousehold();
      // 기록 사진도 Storage 에 올려 가족이 공유할 수 있는 URL 로 저장
      const photoUri = input.photoUri ? await uploadOrLocal(hid, input.photoUri, 'memory.jpg', 'image/jpeg') : null;
      // 낙관적 표시
      setMemories((prev) => [{ id: newId(), photoUri, date: input.date, caption: input.caption }, ...prev]);
      await db.addMemoryRow(hid, { photoUri, date: input.date, caption: input.caption });
    } catch (e) {
      console.error('[AppStore] addMemory 오류:', e);
    }
  }, [ensureHousehold, uploadOrLocal]);

  const removeMemory: AppState['removeMemory'] = useCallback(async (id) => {
    markLocalChange();
    let url: string | null = null;
    setMemories((prev) => {
      url = prev.find((m) => m.id === id)?.photoUri ?? null;
      return prev.filter((m) => m.id !== id);
    });
    try {
      await db.deleteMemoryRow(id);
    } catch (e) {
      console.error('[AppStore] removeMemory 오류:', e);
    }
    // DB 레코드와 별개로 Storage 의 실제 파일도 정리 (실패해도 무방)
    try {
      await db.deleteCatImageByUrl(url);
    } catch (e) {
      console.error('[AppStore] 기록 이미지 파일 정리 실패:', e);
    }
  }, []);

  const addWeight: AppState['addWeight'] = useCallback(async (kg) => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    // "몸무게 기록 하기"를 누를 때마다 그래프에 점 하나씩 추가 (날짜 라벨), 가족 공유
    const d = new Date();
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    markLocalChange();
    setWeights((prev) => [...prev, { id: newId(), month: label, kg, at: Date.now() }]);
    try {
      const hid = await ensureHousehold();
      await db.addWeightRow(hid, label, kg);
    } catch (e) {
      console.error('[AppStore] addWeight 오류:', e);
    }
  }, [ensureHousehold]);

  const setNotification: AppState['setNotification'] = useCallback(async (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value: AppState = {
    ready,
    hasSeenOnboarding,
    permissionsAcked,
    accounts,
    session,
    user,
    cat,
    todos,
    recurringTodos,
    manageItems,
    feed,
    chat,
    removeChat,
    removeFeed,
    schedules,
    memories,
    weights,
    notifications,
    inviteCode,
    catGen,
    markOnboardingSeen,
    markPermissionsAcked,
    signup,
    login,
    logout,
    joinHouseholdByCode,
    saveCatBasic,
    saveCatDetail,
    updateCat,
    setCatPhoto,
    generateCatCharacters,
    resetCatGen,
    addTodo,
    toggleTodo,
    renameTodo,
    setTodoTime,
    removeTodo,
    addRecurringTodo,
    removeRecurringTodo,
    setPresetTime,
    addManageItem,
    bumpManageItem,
    removeManageItem,
    sendChat,
    addSchedule,
    toggleSchedule,
    removeSchedule,
    addMemory,
    removeMemory,
    addWeight,
    setNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
