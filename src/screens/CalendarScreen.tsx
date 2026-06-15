import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { CategoryType, Checkbox } from '../components';
import { useApp } from '../store';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TAG_BG: Record<CategoryType, string> = {
  fun: colors.categoryFun,
  important: colors.categoryImportant,
  personal: colors.categoryPersonal,
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarScreen() {
  const { schedules = [], addSchedule, toggleSchedule, removeSchedule } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CategoryType>('personal');

  const grid = buildGrid(year, month);
  const byDate = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return map;
  }, [schedules]);

  const selectedKey = fmtDate(year, month, selected);
  const selectedEvents = byDate.get(selectedKey) ?? [];

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelected(1);
  };
  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelected(1);
  };

  const openAdd = () => {
    setNewLabel('');
    setNewType('personal');
    setShowAdd(true);
  };

  const confirmAdd = async () => {
    if (!newLabel.trim()) return;
    await addSchedule({ date: selectedKey, label: newLabel.trim(), type: newType });
    setShowAdd(false);
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert('일정 삭제', `'${label}' 일정을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeSchedule(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>
      <View style={styles.headerLine} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.monthRow}>
          <Pressable hitSlop={10} onPress={goPrev}>
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Text style={styles.month}>{month + 1}월</Text>
          <Text style={styles.year}>{year}</Text>
          <Pressable hitSlop={10} onPress={goNext}>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text
              key={w}
              style={[
                styles.weekday,
                i === 0 && { color: '#E2574C' },
                i === 6 && { color: '#4C7CE2' },
              ]}
            >
              {w}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((day, idx) => {
            const key = day ? fmtDate(year, month, day) : null;
            const events = key ? byDate.get(key) ?? [] : [];
            const isSelected = day === selected;
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <Pressable
                key={idx}
                style={styles.cell}
                disabled={!day}
                onPress={() => day && setSelected(day)}
              >
                {day && (
                  <>
                    <View style={[styles.dateCircle, isSelected && styles.dateCircleSel]}>
                      <Text
                        style={[
                          styles.dateText,
                          isToday && styles.dateTextToday,
                          isSelected && styles.dateTextSel,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {events.slice(0, 2).map((ev) => (
                      <View
                        key={ev.id}
                        style={[styles.chip, { backgroundColor: TAG_BG[ev.type] }, ev.done && styles.chipDone]}
                      >
                        <Text style={[styles.chipText, ev.done && styles.chipTextDone]} numberOfLines={1}>
                          {ev.done ? '✓ ' : ''}{ev.label}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.detailHeader}>
          <Text style={styles.selectedDate}>{month + 1}월 {selected}일</Text>
          <Pressable hitSlop={8} style={styles.addPill} onPress={openAdd}>
            <Text style={styles.addPillText}>+ 일정 추가</Text>
          </Pressable>
        </View>
        <Text style={styles.allDay}>하루 종일</Text>
        {selectedEvents.length === 0 ? (
          <Text style={styles.empty}>등록된 일정이 없어요.</Text>
        ) : (
          selectedEvents.map((ev) => (
            <View
              key={ev.id}
              style={[styles.detailRow, { backgroundColor: TAG_BG[ev.type] }, ev.done && styles.detailRowDone]}
            >
              <Checkbox checked={ev.done} onToggle={() => toggleSchedule(ev.id)} size={20} />
              <Text style={[styles.detailText, ev.done && styles.detailTextDone]} numberOfLines={2}>
                {ev.label}
              </Text>
              {ev.who ? (
                <Text style={[styles.detailAuthor, ev.done && styles.detailTextDone]} numberOfLines={1}>
                  작성자: {ev.who}
                </Text>
              ) : null}
              <Pressable
                hitSlop={10}
                style={styles.deleteBtn}
                onPress={() => handleDelete(ev.id, ev.label)}
                accessibilityRole="button"
                accessibilityLabel="일정 삭제"
              >
                <Text style={styles.deleteIcon}>×</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>일정 추가 · {month + 1}월 {selected}일</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="일정 내용"
              placeholderTextColor="#B4B4B4"
              value={newLabel}
              onChangeText={setNewLabel}
              autoFocus
            />
            <Text style={styles.modalLabel}>분류</Text>
            <View style={styles.typeRow}>
              {(['personal', 'important', 'fun'] as CategoryType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeChip,
                    { backgroundColor: TAG_BG[t] },
                    newType === t && styles.typeChipSel,
                  ]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={styles.typeChipText}>
                    {t === 'personal' ? '개인' : t === 'important' ? '공통' : '중요'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhostBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalGhostText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, !newLabel.trim() && { opacity: 0.4 }]}
                disabled={!newLabel.trim()}
                onPress={confirmAdd}
              >
                <Text style={styles.modalConfirmText}>추가</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 23, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: 30, color: colors.primaryDark },
  headerLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.slate200 },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  arrow: { fontSize: 22, color: colors.textPrimary, paddingHorizontal: 4 },
  month: { fontFamily: fontFamily.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  year: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    alignItems: 'center',
    paddingTop: 2,
  },
  dateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleSel: { backgroundColor: colors.primaryDark },
  dateText: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textPrimary },
  dateTextToday: { fontFamily: fontFamily.semibold, color: colors.primaryDark },
  dateTextSel: { color: colors.white, fontFamily: fontFamily.semibold },
  chip: {
    width: '92%',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 3,
    marginTop: 2,
  },
  chipText: { fontFamily: fontFamily.regular, fontSize: 7, color: colors.textPrimary },
  chipDone: { opacity: 0.5 },
  chipTextDone: { textDecorationLine: 'line-through', color: '#6B6B6B' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
    marginTop: 12,
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  selectedDate: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  addPill: {
    backgroundColor: '#FFE1A9',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  addPillText: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textPrimary },
  allDay: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  detailRowDone: { opacity: 0.6 },
  detailText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  detailTextDone: { textDecorationLine: 'line-through', color: '#6B6B6B' },
  detailAuthor: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textSecondary,
    maxWidth: 88,
    textAlign: 'right',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  deleteIcon: {
    fontSize: 20,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: 8,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  modalCard: { width: '100%', backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  modalTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
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
  modalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  typeChipSel: { opacity: 1, borderWidth: 2, borderColor: colors.primaryDark },
  typeChipText: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.textPrimary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalGhostBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostText: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.textPrimary },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.white },
});
