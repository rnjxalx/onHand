import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, fontFamily, fontSize } from '../theme';
import type { TodoItem } from '../store/types';
import { isTodoOverdue } from '../utils/todoTime';

interface TodoModalProps {
  visible: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onToggle: (id: string) => void;
}

/**
 * TodoModal — "오늘 남은 할 일" 배지를 누르면 뜨는 TO DO 팝업
 * store 의 todos 와 연동된다. 항목을 누르면 완료 상태가 토글된다.
 */
export function TodoModal({ visible, onClose, todos, onToggle }: TodoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 카드 내부 클릭이 닫힘으로 전파되지 않도록 막는다 */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>TO DO</Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {todos.map((todo) => (
              <Pressable
                key={todo.id}
                onPress={() => onToggle(todo.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: todo.done }}
                style={styles.item}
              >
                <View style={styles.itemRow}>
                  <Text
                    style={[styles.check, todo.done && styles.checkOn]}
                  >
                    ✓
                  </Text>
                  <Text
                    style={[styles.itemLabel, todo.done && styles.itemLabelDone]}
                  >
                    {todo.label}
                  </Text>
                  {todo.targetTime ? (
                    <Text
                      style={[
                        styles.time,
                        isTodoOverdue(todo, Date.now()) && styles.timeOverdue,
                      ]}
                    >
                      {todo.targetTime}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.divider} />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    maxHeight: '70%',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    color: colors.primaryDark,
    marginBottom: 12,
  },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 4 },
  item: {
    paddingTop: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  check: {
    fontSize: 16,
    color: colors.slate200,
    width: 18,
    textAlign: 'center',
  },
  checkOn: {
    color: colors.primaryDark,
  },
  itemLabel: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  itemLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  time: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    marginLeft: 8,
  },
  timeOverdue: { color: '#E2574C' },
  divider: {
    borderBottomWidth: 1.5,
    borderColor: '#F5C95B',
    borderStyle: 'dashed',
  },
});
