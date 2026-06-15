import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { colors, fontFamily, fontSize, radius } from '../theme';

// 외출 전 체크리스트 — To-do 와 무관한 고정 항목
export const GOOUT_CHECKLIST = ['창문 잠그기', '밥주기', '물 갈아주기', '인덕션 끄기'];

// 이름 + 주격 조사: 받침 있으면 "이가", 없으면 "가" (예: 콩심 → 콩심이가, 루이 → 루이가)
function withSubjectParticle(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const hasBatchim = (code - 0xac00) % 28 !== 0;
    return name + (hasBatchim ? '이가' : '가');
  }
  return `${name}가`; // 한글 음절이 아니면 기본 '가'
}

interface GoOutChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  checked: boolean[];
  onToggle: (index: number) => void;
  catName?: string;
  catImage: ImageSourcePropType;
}

/**
 * GoOutChecklistModal — 외출 버튼을 누르면 뜨는 "외출 전 체크리스트" 팝업
 * To-do 리스트와는 연동되지 않는 고정 4개 항목.
 * 체크 상태는 상위(HomeScreen)에서 관리하며, 팝업을 닫아도 유지되고
 * "귀가" 버튼을 눌렀을 때만 초기화된다. 모두 체크하면 하단 버튼이 활성화된다.
 */
export function GoOutChecklistModal({
  visible,
  onClose,
  onConfirm,
  checked,
  onToggle,
  catName,
  catImage,
}: GoOutChecklistModalProps) {
  const total = GOOUT_CHECKLIST.length;
  const doneCount = useMemo(() => checked.filter(Boolean).length, [checked]);
  const remaining = total - doneCount;
  const allDone = remaining === 0;
  const progress = doneCount / total;
  const name = catName || '아이';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View style={styles.sheet}>
          {/* 핸들 바 */}
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Image
                source={require('../assets/door.png')}
                style={styles.headerIconImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerCaption}>외출 전 체크리스트</Text>
              <Text style={styles.headerTitle}>
                {allDone ? '모두 확인했어요!' : `${remaining}개만 더 확인하면 끝!`}
              </Text>
            </View>
          </View>

          {/* 진행 상태 카드 */}
          <View style={styles.progressCard}>
            <Image source={catImage} style={styles.avatar} resizeMode="cover" />
            <View style={styles.progressBody}>
              <Text style={styles.progressText}>
                {withSubjectParticle(name)} 안전한지 마지막으로 확인해 주세요.
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]}
                  />
                </View>
                <Text style={styles.progressCount}>
                  {doneCount}/{total}
                </Text>
              </View>
            </View>
          </View>

          {/* 체크리스트 */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {GOOUT_CHECKLIST.map((label, index) => {
              const isChecked = checked[index];
              return (
                <Pressable
                  key={label}
                  onPress={() => onToggle(index)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  style={[styles.item, isChecked && styles.itemDone]}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxOn]}>
                    {isChecked && <View style={styles.checkMark} />}
                  </View>
                  <Text style={[styles.itemLabel, isChecked && styles.itemLabelDone]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 하단 CTA */}
          <Pressable
            disabled={!allDone}
            onPress={onConfirm}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              allDone ? styles.ctaActive : styles.ctaInactive,
              pressed && allDone && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.ctaLabel, allDone && styles.ctaLabelActive]}>
              {allDone ? '안심하고 다녀올게요' : '확인할 항목이 남았어요'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate200,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImage: { width: 24, height: 24 },
  headerText: { flex: 1 },
  headerCaption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginTop: 2,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FCE2B0',
    padding: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate100,
  },
  progressBody: { flex: 1 },
  progressText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FEE6C9',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  progressCount: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  list: { flexGrow: 0 },
  listContent: { gap: 10, paddingBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemDone: {
    backgroundColor: '#FDEBCB',
    borderColor: '#FDEBCB',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.white,
  },
  checkMark: {
    width: 11,
    height: 6,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: colors.primaryDark,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  itemLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  itemLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  ctaActive: {
    backgroundColor: colors.primaryDark,
  },
  ctaInactive: {
    backgroundColor: '#FDEBCB',
  },
  ctaLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: '#C79A3E',
  },
  ctaLabelActive: {
    color: colors.white,
  },
});
