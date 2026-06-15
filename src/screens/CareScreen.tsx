import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { Checkbox, RingGauge, WheelPicker, type WheelItem } from '../components';
import { useApp, type ManageItem } from '../store';
import { formatHHMM, isTodoOverdue, pad2, parseHHMM } from '../utils/todoTime';

const DAY_MS = 86_400_000;

// 가족 채팅 — 보낸 사람별 색상 (이름 기준으로 안정적으로 매핑)
const CHAT_COLORS = [
  { avatar: '#4C7CE2', bubble: '#DEE9FB' }, // 파랑
  { avatar: '#E2574C', bubble: '#FBDCD9' }, // 빨강
  { avatar: '#3FB07A', bubble: '#DAF0E6' }, // 초록
  { avatar: '#9B59B6', bubble: '#ECDDF3' }, // 보라
  { avatar: '#E08E0B', bubble: '#FBEBCB' }, // 주황
];
function chatColorFor(who: string) {
  const name = who ?? '';
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return CHAT_COLORS[sum % CHAT_COLORS.length];
}

function formatTime(at: number): string {
  if (!Number.isFinite(at)) return '';
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeAgo(at: number): string {
  if (!Number.isFinite(at)) return ''; // 잘못된 시간값이면 NaN 표시 방지
  const diff = Date.now() - at;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}

export function CareScreen() {
  const {
    todos = [],
    addTodo,
    toggleTodo,
    renameTodo,
    setTodoTime,
    removeTodo,
    manageItems = [],
    addManageItem,
    bumpManageItem,
    removeManageItem,
    chat = [],
    sendChat,
    removeChat,
    feed = [],
    removeFeed,
  } = useApp();

  const [newTodo, setNewTodo] = useState('');
  const [newTodoTime, setNewTodoTime] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // 목표 시간 선택 시트 — 'new'(새 항목) 또는 기존 항목 id, null이면 닫힘
  const [timePickerFor, setTimePickerFor] = useState<'new' | string | null>(null);
  const [tempHour, setTempHour] = useState(9);
  const [tempMin, setTempMin] = useState(0);

  // 목표 시간 초과 표시를 실시간 갱신하기 위한 시계 틱
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hourItems: WheelItem[] = Array.from({ length: 24 }, (_, h) => ({ label: `${pad2(h)}시`, value: h }));
  const minuteItems: WheelItem[] = Array.from({ length: 12 }, (_, i) => ({ label: `${pad2(i * 5)}분`, value: i * 5 }));

  const openTimePicker = (target: 'new' | string, current?: string) => {
    const mins = parseHHMM(current);
    if (mins !== null) {
      setTempHour(Math.floor(mins / 60));
      setTempMin(Math.min(55, Math.round((mins % 60) / 5) * 5));
    } else {
      const d = new Date();
      setTempHour(d.getHours());
      setTempMin(Math.min(55, Math.round(d.getMinutes() / 5) * 5));
    }
    setTimePickerFor(target);
  };

  const confirmTime = () => {
    const t = formatHHMM(tempHour, tempMin);
    if (timePickerFor === 'new') setNewTodoTime(t);
    else if (timePickerFor) setTodoTime(timePickerFor, t);
    setTimePickerFor(null);
  };

  const clearTime = () => {
    if (timePickerFor === 'new') setNewTodoTime(null);
    else if (timePickerFor) setTodoTime(timePickerFor, undefined);
    setTimePickerFor(null);
  };
  const [chatInput, setChatInput] = useState('');
  const [showAddManage, setShowAddManage] = useState(false);
  const [newManageTitle, setNewManageTitle] = useState('');
  const [newManageDays, setNewManageDays] = useState('7');
  const chatScrollRef = useRef<ScrollView>(null);

  // 새 메시지(전송/실시간 수신)가 생기면 항상 가장 아래로 스크롤
  useEffect(() => {
    const id = setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [chat.length]);

  const undoneCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  const handleSubmitTodo = () => {
    if (!newTodo.trim()) return;
    addTodo(newTodo, newTodoTime ?? undefined);
    setNewTodo('');
    setNewTodoTime(null);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput('');
  };

  const handleDeleteChat = (id: string) => {
    Alert.alert('메시지 삭제', '이 메시지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeChat(id) },
    ]);
  };

  const openAddManage = () => {
    setNewManageTitle('');
    setNewManageDays('7');
    setShowAddManage(true);
  };

  const confirmAddManage = () => {
    const days = parseInt(newManageDays, 10);
    addManageItem({ title: newManageTitle, intervalDays: Number.isFinite(days) ? days : 7 });
    setShowAddManage(false);
  };

  const handleManagePress = (item: ManageItem) => {
    Alert.alert(item.title, '어떻게 할까요?', [
      { text: '오늘 완료로 기록', onPress: () => bumpManageItem(item.id) },
      { text: '삭제', style: 'destructive', onPress: () => removeManageItem(item.id) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleEditTodo = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditText(currentLabel);
  };

  const commitEdit = () => {
    if (editingId && editText.trim()) renameTodo(editingId, editText);
    setEditingId(null);
    setEditText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Care</Text>
      </View>
      <View style={styles.headerLine} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {undoneCount > 0 && (
          <View style={styles.warning}>
            <Image source={require('../assets/care-warning-cat.png')} style={styles.warningIcon} resizeMode="contain" />
            <Text style={styles.warningText}>오늘 남은 할 일이 {undoneCount}개 있어요!</Text>
          </View>
        )}

        <Text style={styles.section}>TO DO</Text>
        <View style={styles.card}>
          {todos.map((item, i) => {
            const overdue = isTodoOverdue(item, now);
            return (
              <View key={item.id} style={[styles.todoRow, i > 0 && styles.todoBorder]}>
                <Checkbox checked={item.done} onToggle={() => toggleTodo(item.id)} size={20} />
                {editingId === item.id ? (
                  <TextInput
                    style={[styles.todoLabel, { paddingVertical: 0 }]}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                  />
                ) : (
                  <Text style={[styles.todoLabel, item.done && styles.todoLabelDone]}>
                    {item.label}
                  </Text>
                )}
                <Pressable
                  hitSlop={6}
                  onPress={() => openTimePicker(item.id, item.targetTime)}
                  style={styles.todoTimeBtn}
                >
                  <Text
                    style={[
                      styles.todoTime,
                      !item.targetTime && styles.todoTimePlaceholder,
                      overdue && styles.todoTimeOverdue,
                    ]}
                  >
                    {item.targetTime ?? '시간'}
                  </Text>
                </Pressable>
                <View style={styles.todoActions}>
                  <Pressable hitSlop={8} onPress={() => handleEditTodo(item.id, item.label)}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => removeTodo(item.id)}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View style={[styles.addRow, todos.length > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate200 }]}>
            <Text style={styles.addPlus}>+</Text>
            <TextInput
              style={[styles.addText, { flex: 1, padding: 0 }]}
              placeholder="항목 추가"
              placeholderTextColor="#C9C9C9"
              value={newTodo}
              onChangeText={setNewTodo}
              onSubmitEditing={handleSubmitTodo}
              returnKeyType="done"
            />
            <Pressable
              hitSlop={6}
              onPress={() => openTimePicker('new', newTodoTime ?? undefined)}
              style={styles.todoTimeBtn}
            >
              <Text style={[styles.todoTime, !newTodoTime && styles.todoTimePlaceholder]}>
                {newTodoTime ?? '시간'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>가족 채팅</Text>
        <View style={styles.chatCard}>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          >
            {chat.map((m) => {
              const c = chatColorFor(m.who);
              return (
                <View key={m.id} style={[styles.chatRow, m.mine && styles.chatRowMine]}>
                  {!m.mine && (
                    <View style={[styles.avatar, { backgroundColor: c.avatar }]}>
                      <Text style={styles.avatarText}>{(m.who || '').slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={styles.bubbleWrap}>
                    {!m.mine && <Text style={[styles.senderName, { color: c.avatar }]}>{m.who}</Text>}
                    <Pressable
                      onLongPress={m.mine ? () => handleDeleteChat(m.id) : undefined}
                      delayLongPress={300}
                      style={({ pressed }) => [
                        styles.bubble,
                        m.mine ? styles.bubbleMine : { backgroundColor: c.bubble },
                        m.mine && pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={styles.bubbleText}>{m.text}</Text>
                      <Text style={styles.bubbleTime}>{formatTime(m.at)}</Text>
                    </Pressable>
                  </View>
                  {m.mine && (
                    <View style={[styles.avatar, styles.avatarMine]}>
                      <Text style={styles.avatarText}>{(m.who || '').slice(0, 1)}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <Text style={styles.chatHint}>내 메시지를 길게 누르면 삭제할 수 있어요.</Text>
          <View style={styles.chatInput}>
            <TextInput
              placeholder="메세지를 입력하세요."
              placeholderTextColor="#949494"
              style={styles.chatInputText}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleSendChat}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={handleSendChat} hitSlop={6}>
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>활동 피드</Text>
        {feed.length === 0 ? (
          <Text style={styles.feedEmpty}>아직 기록된 활동이 없어요.</Text>
        ) : (
          feed.slice(0, 5).map((f, i, arr) => (
            <View key={f.id} style={[styles.feedRow, i === arr.length - 1 && styles.feedRowLast]}>
              <Text style={styles.feedLabel}>{f.label}</Text>
              <View style={styles.feedRight}>
                <Text style={styles.feedWho} numberOfLines={1}>{f.who}</Text>
                <Text style={styles.feedTime}>{timeAgo(f.at)}</Text>
                <Pressable
                  style={styles.feedClose}
                  hitSlop={10}
                  onPress={() => removeFeed(f.id)}
                  accessibilityRole="button"
                  accessibilityLabel="활동 기록 삭제"
                >
                  <Text style={styles.feedCloseText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.section}>관리</Text>
        <View style={styles.manageGrid}>
          {manageItems.map((m) => {
            const sinceDays = Math.floor((Date.now() - m.lastDoneAt) / DAY_MS);
            const nextDays = Math.max(0, m.intervalDays - sinceDays);
            const due = nextDays === 0;
            // 남은 일수 비율만큼 링이 채워지고, 기한이 다가올수록 비어간다.
            const progress = m.intervalDays > 0 ? nextDays / m.intervalDays : 0;
            const ringColor = due ? '#E2574C' : colors.primaryDark;
            return (
              <Pressable key={m.id} style={styles.manageCard} onPress={() => handleManagePress(m)}>
                <Text style={styles.manageTitle} numberOfLines={1}>{m.title}</Text>
                <RingGauge
                  size={62}
                  strokeWidth={7}
                  progress={progress}
                  color={ringColor}
                  trackColor="#F0F0F0"
                >
                  {due ? (
                    <Text style={[styles.ringBig, { color: ringColor }]}>오늘</Text>
                  ) : (
                    <>
                      <Text style={[styles.ringBig, { color: ringColor }]}>{nextDays}</Text>
                      <Text style={styles.ringUnit}>일 남음</Text>
                    </>
                  )}
                </RingGauge>
                <Text style={styles.manageSub}>
                  {due ? `${m.title} 할 때예요!` : `${sinceDays}일 전 완료`}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={[styles.manageCard, styles.manageAdd]} onPress={openAddManage}>
            <Text style={styles.manageAddPlus}>＋</Text>
            <Text style={styles.manageAddText}>관리 항목을 추가해주세요.</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showAddManage} transparent animationType="fade" onRequestClose={() => setShowAddManage(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>관리 항목 추가</Text>
            <Text style={styles.modalLabel}>제목</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 양치, 귀 청소"
              placeholderTextColor="#B4B4B4"
              value={newManageTitle}
              onChangeText={setNewManageTitle}
              autoFocus
            />
            <Text style={styles.modalLabel}>주기 (일)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="7"
              placeholderTextColor="#B4B4B4"
              value={newManageDays}
              onChangeText={setNewManageDays}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhostBtn} onPress={() => setShowAddManage(false)}>
                <Text style={styles.modalGhostText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, !newManageTitle.trim() && { opacity: 0.4 }]}
                disabled={!newManageTitle.trim()}
                onPress={confirmAddManage}
              >
                <Text style={styles.modalConfirmText}>추가</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 목표 시간 선택 시트 */}
      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setTimePickerFor(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Pressable hitSlop={8} onPress={() => setTimePickerFor(null)}>
              <Text style={styles.sheetCancel}>취소</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>목표 시간</Text>
            <Pressable hitSlop={8} onPress={confirmTime}>
              <Text style={styles.sheetDone}>완료</Text>
            </Pressable>
          </View>
          <View style={styles.wheelRow}>
            <WheelPicker items={hourItems} selectedValue={tempHour} onChange={setTempHour} />
            <WheelPicker items={minuteItems} selectedValue={tempMin} onChange={setTempMin} />
          </View>
          <Pressable style={styles.clearTimeBtn} onPress={clearTime}>
            <Text style={styles.clearTimeText}>시간 없음</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 12,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 23, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: 30, color: colors.primaryDark },
  headerLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.slate200 },
  scroll: { paddingHorizontal: 23, paddingTop: 24, paddingBottom: 40 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFE1A9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  warningIcon: { width: 43, height: 34 },
  warningText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    flex: 1,
  },
  section: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 32,
    ...CARD_SHADOW,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  todoBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate200 },
  todoLabel: { flex: 1, fontFamily: fontFamily.medium, fontSize: 11, color: colors.textPrimary },
  todoLabelDone: { textDecorationLine: 'line-through', color: '#C9C9C9' },
  todoTimeBtn: {
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  todoTime: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.primaryDark },
  todoTimePlaceholder: { color: '#B4B4B4' },
  todoTimeOverdue: { color: '#E2574C' },
  todoActions: { flexDirection: 'row', gap: 10 },
  actionIcon: { fontSize: 13 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  addPlus: { fontSize: 14, color: '#C9C9C9' },
  addText: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textPrimary },
  chatCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 32,
    ...CARD_SHADOW,
  },
  chatScroll: { maxHeight: 280, marginBottom: 6 },
  chatHint: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  chatRowMine: { justifyContent: 'flex-end' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMine: { backgroundColor: colors.primaryDark },
  avatarText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.white },
  bubbleWrap: { maxWidth: '72%' },
  senderName: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginBottom: 3,
    marginLeft: 2,
  },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.slate100,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bubbleMine: { backgroundColor: '#FFE1A9' },
  bubbleText: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 16, color: colors.textPrimary },
  bubbleTime: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: 'rgba(0,0,0,0.4)',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 5,
    paddingLeft: 10,
    paddingRight: 4,
    height: 36,
    marginTop: 4,
    shadowColor: '#909090',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 11,
    elevation: 2,
  },
  chatInputText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textPrimary,
    padding: 0,
  },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: colors.white, fontSize: 14, fontFamily: fontFamily.semibold },
  feedEmpty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE1A9',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 17,
    marginBottom: 12,
  },
  feedRowLast: { marginBottom: 32 }, // 다른 섹션과 동일한 간격(32)으로 '관리'와 띄움
  feedLabel: { flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary },
  feedRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedClose: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCloseText: { fontSize: 16, lineHeight: 16, color: '#8A7A4F' },
  feedMeta: { fontFamily: fontFamily.regular, fontSize: 10, color: '#818181' },
  // 이름/시간 길이가 달라도 칸 크기를 유지 (고정 폭 + 우측 정렬)
  feedWho: { width: 52, textAlign: 'right', fontFamily: fontFamily.regular, fontSize: 10, color: '#818181' },
  feedTime: { width: 50, textAlign: 'right', fontFamily: fontFamily.regular, fontSize: 10, color: '#818181' },
  manageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    marginTop: 4,
  },
  manageCard: {
    width: '48%',
    height: 150,
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 8,
    ...CARD_SHADOW,
  },
  manageTitle: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.textPrimary },
  ringBig: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  ringUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 8,
    lineHeight: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  manageSub: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  manageAdd: { alignItems: 'center', justifyContent: 'center' },
  manageAddPlus: { fontSize: 28, color: colors.primary, marginBottom: 10 },
  manageAddText: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textPrimary },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalGhostBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.white,
  },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate200,
  },
  sheetTitle: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textPrimary },
  sheetCancel: { fontFamily: fontFamily.regular, fontSize: 15, color: colors.textSecondary },
  sheetDone: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.primaryDark },
  wheelRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 8 },
  clearTimeBtn: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearTimeText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textSecondary },
});
