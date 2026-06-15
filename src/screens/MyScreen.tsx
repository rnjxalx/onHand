import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { WheelPicker, type WheelItem } from '../components';
import { useApp } from '../store';
import type { CatProfile } from '../store';

interface MyScreenProps {
  onSettings?: () => void;
  onAddMemory?: () => void;
}

const PLOT_H = 120;
const POINT_W = 16; // 점(라벨 포함) 영역 너비
const LINE_T = 2.5; // 추세선 두께

function ageFromBirthday(birthday: string): string {
  // Accept YYYY.MM.DD / YYYY-MM-DD / YYYYMMDD
  const m = birthday.match(/^(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})$/);
  if (!m) return '-';
  const [, y, mo, d] = m;
  const birth = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(birth.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const mDiff = now.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < birth.getDate())) years -= 1;
  if (years < 1) {
    const months = Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + mDiff);
    return `${months}개월`;
  }
  return `${years}살`;
}

export function MyScreen({ onSettings, onAddMemory }: MyScreenProps) {
  // 핫리로드 과도기(Provider 미갱신)에도 .length 크래시가 나지 않도록 기본값
  const { cat, memories = [], weights = [], updateCat, addWeight, setCatPhoto, removeMemory } = useApp();
  // 기록 썸네일을 누르면 촬영한 원본 이미지를 전체로 보여주는 뷰어
  const [viewer, setViewer] = useState<
    { id?: string; image: ImageSourcePropType | null; date?: string; caption?: string } | null
  >(null);

  const handleDeleteMemory = (id: string) => {
    Alert.alert('기록 삭제', '이 사진을 삭제할까요?\n가족 모두에게서 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeMemory(id);
          setViewer(null);
        },
      },
    ]);
  };

  // 프로필 수정 모달 (이름/성별/몸무게/사진)
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editGender, setEditGender] = useState<CatProfile['gender']>('');
  const [editWeightTenths, setEditWeightTenths] = useState(40); // 4.0kg 기본 (0.1kg 단위 정수)

  // 입력한 생년월일로 나이를 실시간 계산해 미리 보여준다.
  const previewAge = ageFromBirthday(editBirthday);
  // 몸무게 다이얼 항목 (0.0 ~ 20.0 Kg, 0.1 단위)
  const weightItems: WheelItem[] = Array.from({ length: 201 }, (_, i) => ({
    label: `${(i / 10).toFixed(1)} Kg`,
    value: i,
  }));

  const openEdit = () => {
    setEditName(cat?.name ?? '');
    setEditBirthday(cat?.birthday ?? '');
    setEditGender(cat?.gender ?? '');
    const parsed = parseFloat(cat?.weight ?? '');
    setEditWeightTenths(Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 10) : 40);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    await updateCat({ name: editName.trim(), birthday: editBirthday.trim(), gender: editGender });
    setEditOpen(false);
  };

  // "몸무게 기록 하기" — 다이얼 값을 그래프에 점으로 추가하고 현재 몸무게도 갱신
  const recordWeight = async () => {
    const kg = editWeightTenths / 10;
    if (kg <= 0) return;
    await addWeight(kg);
    await updateCat({ weight: kg.toFixed(1) });
    Alert.alert('기록 완료', `${kg.toFixed(1)}Kg을(를) 체중 변화 그래프에 추가했어요.`);
  };

  // 사진 변경 — 촬영/앨범을 인라인으로 호출 (수정 모달 위에서 동작하도록 네비게이션 미사용)
  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          '권한 필요',
          source === 'camera'
            ? '설정에서 카메라 권한을 허용해주세요.'
            : '설정에서 사진 접근 권한을 허용해주세요.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) {
        await setCatPhoto(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('실패', err instanceof Error ? err.message : '다시 시도해주세요.');
    }
  };

  const changePhoto = () => {
    Alert.alert('사진 변경', undefined, [
      { text: '사진 촬영', onPress: () => pickPhoto('camera') },
      { text: '앨범에서 선택', onPress: () => pickPhoto('library') },
      { text: '취소', style: 'cancel' },
    ]);
  };
  // 그래프 점/선을 픽셀 좌표로 그리기 위해 실제 plot 너비를 측정
  const [plotW, setPlotW] = useState(0);

  // 실제 등록한 기록만 표시 (데모 샘플 없음 → 모든 항목이 삭제 가능)
  const memoryCards = useMemo(
    () =>
      memories.map((m) => ({
        id: m.id,
        image: m.photoUri ? ({ uri: m.photoUri } as ImageSourcePropType) : null,
        date: m.date,
        caption: m.caption,
      })),
    [memories],
  );

  // 직접 등록한 체중만 시간순으로 표시 (프리셋/예시 데이터 없음)
  const weightSeries = useMemo(
    () => (Array.isArray(weights) ? [...weights] : []).sort((a, b) => a.at - b.at),
    [weights],
  );
  const hasWeights = weightSeries.length > 0;

  const kgs = weightSeries.map((w) => w.kg);
  const minKg = hasWeights ? Math.min(...kgs) - 0.05 : 0;
  const maxKg = hasWeights ? Math.max(...kgs) + 0.05 : 1;

  // 각 측정값을 plot 내부 픽셀 좌표(좌상단 원점, y는 아래로 증가)로 변환
  const points = useMemo(() => {
    if (plotW <= 0) return [];
    const n = weightSeries.length;
    const span = maxKg - minKg || 1;
    return weightSeries.map((w, i) => {
      const ratio = (w.kg - minKg) / span;
      const x = n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW;
      const y = PLOT_H * (1 - ratio);
      return { id: w.id, kg: w.kg, x, y };
    });
  }, [plotW, weightSeries, minKg, maxKg]);

  // 연속한 두 점을 잇는 선분(회전한 막대 View)으로 추세선 구성
  const segments = useMemo(() => {
    const segs: { key: number; length: number; angle: number; left: number; top: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      segs.push({
        key: i,
        length,
        angle,
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - LINE_T / 2,
      });
    }
    return segs;
  }, [points]);

  const profilePhoto = cat?.photoUri
    ? { uri: cat.photoUri }
    : require('../assets/cat-profile.png');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My</Text>
        <Pressable hitSlop={10} onPress={onSettings}>
          <Image
            source={require('../assets/setting.png')}
            style={styles.settingIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>
      <View style={styles.headerLine} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image source={profilePhoto} style={styles.profilePhoto} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{cat?.name || '이름 없음'}</Text>
            <Text style={styles.profileBreed}>{cat?.breed || '품종 미지정'}</Text>
            <View style={styles.profileRows}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>나이</Text>
                <Text style={styles.profileValue}>{cat ? ageFromBirthday(cat.birthday) : '-'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>몸무게</Text>
                <Text style={styles.profileValue}>{cat?.weight ? `${cat.weight} Kg` : '-'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>성별</Text>
                <Text style={styles.profileValue}>
                  {cat?.gender === '남아' ? '남' : cat?.gender === '여아' ? '여' : '-'}
                </Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.editLink} hitSlop={8} onPress={openEdit}>
            <Text style={styles.editText}>수정</Text>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>기록</Text>
          <Pressable hitSlop={8} onPress={onAddMemory}>
            <Text style={styles.addMemory}>+ 추억 남기기</Text>
          </Pressable>
        </View>
        {memoryCards.length === 0 ? (
          <Text style={styles.memoryEmpty}>
            아직 남긴 추억이 없어요.{'\n'}+ 추억 남기기로 사진을 등록해보세요.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.memoryRow}
          >
            {memoryCards.map((m, i) => (
              <Pressable
                key={m.id ?? i}
                style={({ pressed }) => [styles.memoryCard, pressed && { opacity: 0.85 }]}
                onPress={() => setViewer(m)}
                accessibilityRole="imagebutton"
                accessibilityLabel="기록 사진 크게 보기"
              >
                {/* 정사각형 썸네일(cover로 화면상 크롭, 원본 파일은 그대로) */}
                {m.image ? (
                  <Image source={m.image} style={styles.memoryImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.memoryImage, styles.memoryPlaceholder]} />
                )}
                {(m.caption || m.date) && (
                  <View style={styles.memoryOverlay}>
                    {m.date ? <Text style={styles.memoryDate}>{m.date}</Text> : null}
                    {m.caption ? <Text style={styles.memoryCaption}>{m.caption}</Text> : null}
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.section, styles.chartTitle]}>체중 변화</Text>
        <View style={styles.chartCard}>
          {hasWeights ? (
            <>
              <View
                style={styles.plot}
                onLayout={(e) => setPlotW(e.nativeEvent.layout.width)}
              >
                {[0, 1, 2, 3].map((g) => (
                  <View key={g} style={[styles.gridLine, { top: (PLOT_H / 3) * g }]} />
                ))}

                {/* 점들을 이어 변화 추이를 보여주는 추세선 */}
                {segments.map((s) => (
                  <View
                    key={`seg-${s.key}`}
                    style={[
                      styles.line,
                      {
                        width: s.length,
                        left: s.left,
                        top: s.top,
                        transform: [{ rotate: `${s.angle}deg` }],
                      },
                    ]}
                  />
                ))}

                {/* 각 측정 점 + 값 라벨 */}
                {points.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.point, { left: p.x - POINT_W / 2, top: p.y - POINT_W / 2 }]}
                  >
                    <Text style={styles.pointLabel}>{p.kg}</Text>
                    <View style={styles.dot} />
                  </View>
                ))}
              </View>
              <View style={styles.monthRow}>
                {weightSeries.map((w) => (
                  <Text key={w.id} style={styles.monthLabel}>{w.month}</Text>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.weightEmpty}>
              <Text style={styles.weightEmptyText}>
                아직 등록된 체중이 없어요.{'\n'}프로필 수정에서 몸무게를 입력하면 여기에 표시돼요.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 기록 사진 전체 보기 */}
      <Modal
        visible={viewer != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer?.image && (
            <Image source={viewer.image} style={styles.viewerImage} resizeMode="contain" />
          )}
          {viewer && (viewer.date || viewer.caption) ? (
            <View style={styles.viewerMeta}>
              {viewer.date ? <Text style={styles.viewerDate}>{viewer.date}</Text> : null}
              {viewer.caption ? <Text style={styles.viewerCaption}>{viewer.caption}</Text> : null}
            </View>
          ) : null}
          <Pressable style={styles.viewerClose} hitSlop={10} onPress={() => setViewer(null)}>
            <Text style={styles.viewerCloseText}>×</Text>
          </Pressable>
          {viewer?.id ? (
            <Pressable
              style={styles.viewerDelete}
              hitSlop={10}
              onPress={() => handleDeleteMemory(viewer.id as string)}
              accessibilityRole="button"
              accessibilityLabel="기록 삭제"
            >
              <Text style={styles.viewerDeleteText}>삭제</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      {/* 프로필 수정 (이름/성별/몸무게/사진) */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.editRoot}>
          <Pressable style={styles.editBackdrop} onPress={() => setEditOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.editSheet}>
              <View style={styles.editHandle} />
              <Text style={styles.editTitle}>프로필 수정</Text>

              <View style={styles.editPhotoWrap}>
                <View style={styles.editPhotoCircle}>
                  <Image source={profilePhoto} style={styles.editPhotoImg} resizeMode="cover" />
                </View>
                <Pressable style={styles.editPhotoBtn} hitSlop={8} onPress={changePhoto}>
                  <Image
                    source={require('../assets/camera.png')}
                    style={styles.editPhotoIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.editPhotoBtnText}>사진 변경</Text>
                </Pressable>
              </View>

              <Text style={styles.editLabel}>이름</Text>
              <View style={styles.editField}>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="이름"
                  placeholderTextColor="#B4B4B4"
                />
              </View>

              <Text style={styles.editLabel}>생년월일</Text>
              <View style={styles.editField}>
                <TextInput
                  style={styles.editInput}
                  value={editBirthday}
                  onChangeText={setEditBirthday}
                  placeholder="YYYY.MM.DD"
                  placeholderTextColor="#B4B4B4"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {previewAge !== '-' && <Text style={styles.ageHint}>나이 {previewAge}</Text>}

              <Text style={styles.editLabel}>성별</Text>
              <View style={styles.genderRow}>
                {(['남아', '여아'] as const).map((g) => {
                  const active = editGender === g;
                  return (
                    <Pressable
                      key={g}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      onPress={() => setEditGender(active ? '' : g)}
                    >
                      <Text style={[styles.genderText, active && styles.genderTextActive]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.editLabel}>몸무게</Text>
              <View style={styles.weightDialWrap}>
                <WheelPicker
                  items={weightItems}
                  selectedValue={editWeightTenths}
                  onChange={setEditWeightTenths}
                  visibleCount={3}
                />
              </View>
              <Pressable style={styles.recordBtn} onPress={recordWeight}>
                <Text style={styles.recordBtnText}>몸무게 기록 하기</Text>
              </Pressable>

              <View style={styles.editActions}>
                <Pressable style={[styles.editBtn, styles.editCancel]} onPress={() => setEditOpen(false)}>
                  <Text style={styles.editCancelText}>취소</Text>
                </Pressable>
                <Pressable style={[styles.editBtn, styles.editSave]} onPress={saveEdit}>
                  <Text style={styles.editSaveText}>저장</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 23,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: 30, color: colors.primaryDark },
  settingIcon: { width: 24, height: 24 },
  headerLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.slate200 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  profilePhoto: { width: 96, height: 96, borderRadius: 12 },
  profileInfo: { flex: 1, marginLeft: 18 },
  profileName: { fontFamily: fontFamily.regular, fontSize: fontSize.base, color: colors.textPrimary },
  profileBreed: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: '#A2A2A2',
    marginTop: 4,
    marginBottom: 8,
  },
  profileRows: { gap: 4, marginTop: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileLabel: { width: 48, fontFamily: fontFamily.regular, fontSize: 10, color: colors.textPrimary, lineHeight: 18 },
  profileValue: { flex: 1, fontFamily: fontFamily.regular, fontSize: 10, color: colors.textPrimary, lineHeight: 18 },
  editLink: { position: 'absolute', right: 14, bottom: 12 },
  editText: { fontFamily: fontFamily.regular, fontSize: 10, color: '#8A8A8A' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 14,
  },
  section: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  addMemory: { fontFamily: fontFamily.regular, fontSize: 10, color: '#A2A2A2' },
  memoryRow: { gap: 12, paddingRight: 8 },
  memoryEmpty: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  memoryCard: {
    width: 140,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.slate100,
  },
  memoryImage: { width: '100%', height: '100%' },
  memoryPlaceholder: { backgroundColor: colors.slate200 },
  memoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  memoryDate: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.white },
  memoryCaption: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.white, marginTop: 4 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
  viewerMeta: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
  },
  viewerDate: { fontFamily: fontFamily.semibold, fontSize: 16, color: colors.white },
  viewerCaption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.white,
    marginTop: 6,
    lineHeight: 19,
  },
  viewerClose: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: { fontSize: 30, color: colors.white },
  viewerDelete: {
    position: 'absolute',
    top: 20,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(226,72,61,0.92)',
  },
  viewerDeleteText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.white },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    paddingTop: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: { marginTop: 30, marginBottom: 14 },
  weightEmpty: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  weightEmptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  plot: { height: PLOT_H, marginHorizontal: 8 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
  },
  line: {
    position: 'absolute',
    height: LINE_T,
    borderRadius: LINE_T / 2,
    backgroundColor: colors.primaryDark,
  },
  point: {
    position: 'absolute',
    width: POINT_W,
    height: POINT_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLabel: {
    position: 'absolute',
    top: -13,
    left: -14,
    right: -14,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 8,
    color: colors.textPrimary,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primaryDark,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginHorizontal: 8 },

  // 프로필 수정 모달
  editRoot: { flex: 1, justifyContent: 'flex-end' },
  editBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  editSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 28,
  },
  editHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate200,
    marginBottom: 12,
  },
  editTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  editPhotoWrap: { alignItems: 'center', gap: 8, marginBottom: 6 },
  editPhotoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.slate100,
  },
  editPhotoImg: { width: '100%', height: '100%' },
  editPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editPhotoIcon: { width: 16, height: 16 },
  editPhotoBtnText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primaryDark },
  ageHint: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  editLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  editField: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: 0,
  },
  editSuffix: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textPrimary },
  weightDialWrap: { width: 180, height: 120, alignSelf: 'center' },
  recordBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  recordBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.white },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textSecondary },
  genderTextActive: { fontFamily: fontFamily.semibold, color: colors.white },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editBtn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  editCancel: { backgroundColor: colors.slate100 },
  editCancelText: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.textSecondary },
  editSave: { backgroundColor: colors.primaryDark },
  editSaveText: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.white },
  monthLabel: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textPrimary },
});
