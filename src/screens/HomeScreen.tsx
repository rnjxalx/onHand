import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontFamily, fontSize } from '../theme';
import {
  TabBar,
  TabKey,
  GoOutChecklistModal,
  GOOUT_CHECKLIST,
  TodoModal,
} from '../components';
import { useApp } from '../store';
import type { TodoItem } from '../store';
import { isTodoOverdue, parseHHMM } from '../utils/todoTime';

interface HomeScreenProps {
  activeTab?: TabKey;
  onTabChange?: (key: TabKey) => void;
  showTabBar?: boolean;
}

const HAPPY_MESSAGES = [
  { top: '오늘도 행복해!', bottom: '같이 놀아줘~' },
  { top: '맛있는 밥 잘 먹었어.', bottom: '고마워 집사야!' },
];

// 전용 메시지가 없는 항목이 밀렸을 때 쓰는 중립 슬픔 메시지 (특정 할 일과 무관)
const SAD_MESSAGES = [
  { top: '아직 못 한 일이 있어..', bottom: '챙겨줘 ㅠㅠ' },
];

// 아직 마감 시간은 안 지났지만 할 일이 남아있을 때(기본 상태)
const BASIC_MESSAGES = [
  { top: '오늘 할 일이 남았어.', bottom: '잊지 마!' },
  { top: '집사야 할 거 없으면', bottom: '나랑 놀자!!' },
];

// 특정 할 일의 목표 시간이 지났을 때 보여줄 전용 메시지 (라벨 키워드로 매칭)
function overdueMessageFor(label: string): { top: string; bottom: string } | null {
  if (label.includes('화장실')) return { top: '화장실이 너무 더러워..', bottom: '치워줘!!' };
  if (label.includes('물')) return { top: '목말라..', bottom: '물 줘!!!' };
  if (label.includes('놀')) return { top: '나 심심해..', bottom: '놀아줘!!!' };
  if (label.includes('밥') || label.includes('사료') || label.includes('먹'))
    return { top: '배고파..', bottom: '밥 줘!!' };
  return null;
}

export function HomeScreen({
  activeTab = 'home',
  onTabChange,
  showTabBar = false,
}: HomeScreenProps) {
  const { cat, todos = [], toggleTodo } = useApp();
  const [isOut, setIsOut] = useState(false);
  // 외출/귀가 버튼을 누르면 잠깐(1회성) 보여줄 감정. null이면 To-do 기반 감정 사용
  const [transientMood, setTransientMood] = useState<'out' | 'home' | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [checklistChecked, setChecklistChecked] = useState<boolean[]>(
    () => GOOUT_CHECKLIST.map(() => false),
  );

  const toggleChecklist = (index: number) =>
    setChecklistChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));

  // 목표 시간이 지났는지 주기적으로(30초) 다시 판단하기 위한 시계 틱
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // 외출/귀가 감정을 잠깐만 보여주고 자동으로 To-do 기반 감정으로 되돌린다.
  const flashMood = useCallback((mood: 'out' | 'home') => {
    if (transientTimer.current) clearTimeout(transientTimer.current);
    setTransientMood(mood);
    transientTimer.current = setTimeout(() => setTransientMood(null), 6000);
  }, []);

  // 다른 탭에 다녀오면(포커스 해제) 1회성 감정을 비워 To-do 기반으로 되돌린다.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (transientTimer.current) clearTimeout(transientTimer.current);
        setTransientMood(null);
      };
    }, []),
  );

  // 목표 시간이 지났는데 아직 못 끝낸 할 일이 하나라도 있으면 고양이가 슬퍼진다.
  const hasOverdue = useMemo(
    () => todos.some((t) => isTodoOverdue(t, now)),
    [todos, now],
  );

  const undoneCount = todos.filter((t) => !t.done).length;

  // To-do 기반 기본 감정:
  //  - 목표 시간이 지난 미완료 항목 있음 → sad
  //  - 시간은 안 지났지만 아직 체크 안 한 항목 있음 → basic
  //  - 남은 할 일 없음 → happy
  const baseMood: 'sad' | 'basic' | 'happy' = hasOverdue
    ? 'sad'
    : undoneCount > 0
    ? 'basic'
    : 'happy';

  // 할 일이 있고 그 전부를 완료한 상태(빈 목록과 구분)
  const allTodosDone = todos.length > 0 && undoneCount === 0;

  // 목표 시간이 가장 오래 지난(목표 시간이 가장 이른) 미완료 항목
  const mostOverdueTodo = useMemo<TodoItem | null>(() => {
    if (baseMood !== 'sad') return null;
    let chosen: TodoItem | null = null;
    let earliest = Infinity;
    for (const t of todos) {
      if (!isTodoOverdue(t, now)) continue;
      const m = parseHHMM(t.targetTime);
      if (m === null) continue;
      if (m < earliest) {
        earliest = m;
        chosen = t;
      }
    }
    return chosen;
  }, [baseMood, todos, now]);

  const message = useMemo(() => {
    // 외출/귀가 직후에는 1회성 인사말, 그 외에는 To-do 기반 메시지
    if (transientMood === 'out') return { top: '집에 빨리 와야 돼...!!', bottom: '' };
    if (transientMood === 'home') return { top: '반갑다 집사야!!', bottom: '' };
    if (baseMood === 'sad') {
      // 가장 오래 밀린 항목 기준: 전용 메시지가 있으면 그것, 없으면 일반 슬픈 메시지
      const specific = mostOverdueTodo ? overdueMessageFor(mostOverdueTodo.label) : null;
      return specific ?? SAD_MESSAGES[Math.floor(Math.random() * SAD_MESSAGES.length)];
    }
    if (baseMood === 'basic') return BASIC_MESSAGES[Math.floor(Math.random() * BASIC_MESSAGES.length)];
    // 할 일을 전부 완료한 경우 전용 멘트, 할 일이 아예 없으면 일반 행복 메시지
    if (allTodosDone) return { top: '오늘도 케어해줘서 고마워!!', bottom: '' };
    return HAPPY_MESSAGES[Math.floor(Math.random() * HAPPY_MESSAGES.length)];
  }, [transientMood, baseMood, mostOverdueTodo, allTodosDone]);

  // 외출 직후 슬픈 표정 / 귀가 직후 행복한 표정을 1회성으로 보여주고,
  // 그 외에는 To-do 기반 기본 감정을 사용. (AI 생성 캐릭터가 있으면 그것을 사용)
  const moodKey: 'basic' | 'happy' | 'sad' =
    transientMood === 'out' ? 'sad' : transientMood === 'home' ? 'happy' : baseMood;
  const generated = cat?.generated ?? null;
  const catImage = generated?.[moodKey]
    ? { uri: generated[moodKey] }
    : generated?.basic
    ? { uri: generated.basic }
    : cat?.photoUri
    ? { uri: cat.photoUri }
    : require('../assets/cat-sad.png');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>
      <View style={styles.headerLine} />

      <View style={styles.content}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleTop}>{message.top}</Text>
          {message.bottom ? (
            <Text style={styles.bubbleBottom}>{message.bottom}</Text>
          ) : null}
          <View style={styles.bubbleTail} />
        </View>

        <View style={styles.catWrap}>
          <Image source={catImage} style={styles.cat} resizeMode="contain" />
        </View>

        {undoneCount > 0 && (
          <Pressable
            style={({ pressed }) => [styles.todoBadge, pressed && { opacity: 0.8 }]}
            onPress={() => setTodoOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.todoBadgeText}>오늘 남은 할 일 {undoneCount}개</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.goOut,
            isOut && { backgroundColor: colors.primaryDark },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            if (isOut) {
              // 귀가: 행복 표정 + 인사말을 1회성으로 보여주고 체크리스트 초기화
              setIsOut(false);
              flashMood('home');
              setChecklistChecked(GOOUT_CHECKLIST.map(() => false));
            } else {
              setChecklistOpen(true);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={isOut ? '귀가' : '외출'}
        >
          <Image
            source={require('../assets/door.png')}
            style={styles.goOutIcon}
            resizeMode="contain"
          />
          <Text style={[styles.goOutLabel, isOut && { color: colors.white }]}>
            {isOut ? '귀가' : '외출'}
          </Text>
        </Pressable>
      </View>

      <GoOutChecklistModal
        visible={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onConfirm={() => {
          setChecklistOpen(false);
          setIsOut(true);
          // 외출: 슬픈 표정 + 인사말을 1회성으로 보여줌
          flashMood('out');
        }}
        checked={checklistChecked}
        onToggle={toggleChecklist}
        catName={cat?.name}
        catImage={catImage}
      />

      <TodoModal
        visible={todoOpen}
        onClose={() => setTodoOpen(false)}
        todos={todos}
        onToggle={toggleTodo}
      />

      {showTabBar && <TabBar active={activeTab} onChange={onTabChange} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize['3xl'],
    color: colors.primaryDark,
  },
  headerLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.slate200 },
  content: { flex: 1, paddingHorizontal: 24 },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    marginTop: 88,
    // 1줄/2줄 메시지에 관계없이 말풍선 크기·위치를 고정 → 캐릭터가 위아래로 안 움직임
    width: '86%',
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  bubbleTop: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bubbleBottom: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.white,
  },
  catWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cat: { width: 320, height: 400 },
  todoBadge: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#FFE1A9',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  todoBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  goOut: {
    position: 'absolute',
    left: 10,
    bottom: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goOutIcon: { width: 20, height: 20 },
  goOutLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.tabSmall,
    color: colors.primaryDark,
  },
});
