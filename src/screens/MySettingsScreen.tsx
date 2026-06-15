import React, { useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize } from '../theme';
import { Toggle, WheelPicker, type WheelItem } from '../components';
import { useApp, TODO_PRESETS, type NotificationSettings } from '../store';
import { formatHHMM, pad2, parseHHMM } from '../utils/todoTime';

interface MySettingsScreenProps {
  onBack?: () => void;
  onPickPhoto?: () => void;
  onLoggedOut?: () => void;
}

const NOTI_KEYS: { key: keyof NotificationSettings; label: string; icon: ImageSourcePropType }[] = [
  { key: 'meal', label: '급식 알림', icon: require('../assets/food.png') },
  { key: 'water', label: '물 알림', icon: require('../assets/water.png') },
  { key: 'play', label: '놀이 알림', icon: require('../assets/play.png') },
  { key: 'litter', label: '화장실 알림', icon: require('../assets/toilet.png') },
  { key: 'other', label: '기타 알림', icon: require('../assets/todo.png') },
];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 예방접종 기본 항목명 (완료/미완료는 날짜 선택 여부로 표시)
const VACCINE_BASE = ['1차 접종', '2차 접종', '3차 접종'];

// 'YYYY.MM.DD' → Date (실패 시 null)
function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function MySettingsScreen({ onBack, onPickPhoto, onLoggedOut }: MySettingsScreenProps) {
  const {
    cat,
    catGen,
    generateCatCharacters,
    saveCatDetail,
    inviteCode,
    joinHouseholdByCode,
    notifications,
    setNotification,
    logout,
    // 핫리로드 전환 중 Provider가 갱신되기 전이라도 렌더 크래시가 나지 않도록 기본값
    todos = [],
    recurringTodos = [],
    setPresetTime,
    addRecurringTodo,
    removeRecurringTodo,
  } = useApp();

  // AI 캐릭터 생성 (사진을 바꾼 뒤 다시 만들 수 있도록)
  const catGenRunning = catGen.status === 'running';
  const generated = cat?.generated ?? null;
  // 프로필 원형은 실제 촬영한 고양이 사진을 보여준다(생성 캐릭터 X)
  const profileCharSource = cat?.photoUri
    ? { uri: cat.photoUri }
    : require('../assets/cat-character-sample.png');
  const GENERATED_EMOTIONS: { key: 'basic' | 'happy' | 'sad'; label: string }[] = [
    { key: 'basic', label: '기본' },
    { key: 'happy', label: '행복' },
    { key: 'sad', label: '슬픔' },
  ];
  const handleGenerate = () => {
    if (cat?.photoUri && !catGenRunning) generateCatCharacters(cat.photoUri);
  };

  // 초대 코드 복사 (클립보드)
  const [copied, setCopied] = useState(false);
  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      Alert.alert('초대 코드', `${inviteCode}\n\n가족에게 이 코드를 공유해주세요.`);
    }
  };

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code || joining) return;
    setJoining(true);
    const res = await joinHouseholdByCode(code);
    setJoining(false);
    if (!res.ok) {
      Alert.alert('합류 실패', res.error);
      return;
    }
    setJoinCode('');
    Alert.alert('완료', '가족에 합류했어요! 고양이와 할 일이 동기화됩니다.');
  };

  // 고정 프리셋(밥/물/놀이/화장실) 목표 시간 선택용 휠 시트
  const [presetSheetFor, setPresetSheetFor] = useState<string | null>(null);
  const [tempHour, setTempHour] = useState(9);
  const [tempMin, setTempMin] = useState(0);
  const hourItems: WheelItem[] = Array.from({ length: 24 }, (_, h) => ({ label: `${pad2(h)}시`, value: h }));
  const minuteItems: WheelItem[] = Array.from({ length: 12 }, (_, i) => ({ label: `${pad2(i * 5)}분`, value: i * 5 }));
  const openPresetTime = (label: string, current: string | null) => {
    const mins = parseHHMM(current);
    if (mins !== null) {
      setTempHour(Math.floor(mins / 60));
      setTempMin(Math.min(55, Math.round((mins % 60) / 5) * 5));
    } else {
      const d = new Date();
      setTempHour(d.getHours());
      setTempMin(Math.min(55, Math.round(d.getMinutes() / 5) * 5));
    }
    setPresetSheetFor(label);
  };
  const confirmPresetTime = () => {
    if (presetSheetFor) setPresetTime(presetSheetFor, formatHHMM(tempHour, tempMin));
    setPresetSheetFor(null);
  };

  const [newPresetLabel, setNewPresetLabel] = useState('');
  const submitCustomPreset = () => {
    const trimmed = newPresetLabel.trim();
    if (!trimmed) return;
    if (TODO_PRESETS.some((p) => p.label === trimmed)) {
      Alert.alert('추가할 수 없어요', '기본 프리셋과 같은 이름은 사용할 수 없어요.');
      return;
    }
    if (recurringTodos.some((r) => r.label === trimmed)) return;
    addRecurringTodo(trimmed);
    setNewPresetLabel('');
  };

  const [neutered, setNeutered] = useState<'' | '했어요' | '안 했어요'>(cat?.neutered ?? '');
  // 기저질환 및 알러지 — 여러 항목을 리스트로 관리 (저장 시 줄바꿈으로 합침)
  const [conditions, setConditions] = useState<string[]>(() =>
    (cat?.condition ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
  );
  const [newCondition, setNewCondition] = useState('');
  const submitCondition = () => {
    const t = newCondition.trim();
    if (!t) return;
    setConditions((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setNewCondition('');
  };
  const removeCondition = (idx: number) =>
    setConditions((prev) => prev.filter((_, i) => i !== idx));

  const initialVaccines = VACCINE_BASE.map((label, i) => {
    const existing = cat?.vaccines?.[i];
    const skipped = existing?.skipped ?? false;
    const date = skipped ? '' : (existing?.date ?? '');
    // 상태: 날짜 있으면 완료 / skipped면 접종 안함 / 둘 다 아니면 미완료
    return { label, done: !!date, date, skipped };
  });
  const [vaccines, setVaccines] = useState(initialVaccines);

  // 중성화 휠 선택 모달
  const [showNeutered, setShowNeutered] = useState(false);
  const [tempNeutered, setTempNeutered] = useState<'했어요' | '안 했어요'>('했어요');

  const openNeutered = () => {
    setTempNeutered(neutered === '안 했어요' ? '안 했어요' : '했어요');
    setShowNeutered(true);
  };
  const confirmNeutered = () => {
    setNeutered(tempNeutered);
    setShowNeutered(false);
  };
  const neuteredItems: WheelItem<string>[] = [
    { label: '했어요', value: '했어요' },
    { label: '안 했어요', value: '안 했어요' },
  ];

  // (몸무게 설정은 MY > 프로필 수정으로 이동 — 여기서는 제거)

  // 예방접종 날짜 선택 (앱에서 직접 만든 노란색 휠 시트 — iOS/Android 공통)
  const [dateTarget, setDateTarget] = useState<number | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const openDate = (i: number) => {
    setTempDate(parseDate(vaccines[i].date) ?? new Date());
    setDateTarget(i);
  };
  const applyDate = (i: number, d: Date) => {
    setVaccines((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, done: true, date: fmtDate(d), skipped: false } : v)),
    );
  };
  const confirmDate = () => {
    if (dateTarget != null) applyDate(dateTarget, tempDate);
    setDateTarget(null);
  };
  // 미접종(미설정)으로 되돌리기
  const clearVaccine = () => {
    if (dateTarget != null) {
      const i = dateTarget;
      setVaccines((prev) =>
        prev.map((v, idx) => (idx === i ? { ...v, done: false, date: '', skipped: false } : v)),
      );
    }
    setDateTarget(null);
  };

  // 휠 값 변경 — 일(日)은 해당 연/월의 말일을 넘지 않도록 보정
  const tYear = tempDate.getFullYear();
  const tMonth = tempDate.getMonth() + 1; // 1~12
  const tDay = tempDate.getDate();
  const daysInMonth = (y: number, m1: number) => new Date(y, m1, 0).getDate();
  const setYear = (y: number) =>
    setTempDate(new Date(y, tMonth - 1, Math.min(tDay, daysInMonth(y, tMonth))));
  const setMonth = (m1: number) =>
    setTempDate(new Date(tYear, m1 - 1, Math.min(tDay, daysInMonth(tYear, m1))));
  const setDay = (d: number) => setTempDate(new Date(tYear, tMonth - 1, d));

  const thisYear = new Date().getFullYear();
  const yearItems: WheelItem[] = [];
  for (let y = thisYear - 20; y <= thisYear + 1; y++) yearItems.push({ label: `${y}년`, value: y });
  const monthItems: WheelItem[] = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}월`,
    value: i + 1,
  }));
  const dayItems: WheelItem[] = Array.from({ length: daysInMonth(tYear, tMonth) }, (_, i) => ({
    label: `${i + 1}일`,
    value: i + 1,
  }));


  // 변동사항이 생기면 자동 저장 (최초 마운트 시에는 저장하지 않음)
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveCatDetail({
        neutered,
        weight: cat?.weight ?? '', // 몸무게는 프로필 수정에서 관리 → 기존 값 유지
        vaccines,
        condition: conditions.join('\n'),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [neutered, conditions, vaccines, saveCatDetail, cat?.weight]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLoggedOut?.();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹ </Text>
        </Pressable>
        <Text style={styles.headerTitle}>Setting</Text>
      </View>
      <View style={styles.headerLine} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>상세 정보</Text>

        <Text style={styles.label}>중성화 수술 여부</Text>
        <Pressable style={styles.field} onPress={openNeutered}>
          <Text style={neutered ? styles.value : styles.placeholder}>{neutered || '중성화 수술 여부'}</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>

        <Text style={styles.label}>예방접종</Text>
        {vaccines.map((v, i) => {
          const filled = v.skipped || !!v.date;
          return (
            <Pressable
              key={i}
              style={styles.vaccineBox}
              onPress={() => openDate(i)}
              accessibilityRole="button"
              accessibilityLabel={`${VACCINE_BASE[i]} 상태 선택`}
            >
              <Text style={styles.vaccineLabel}>{VACCINE_BASE[i]}</Text>
              <View style={styles.vaccineDate}>
                <Text style={[filled ? styles.value : styles.placeholder, styles.vaccineDateText]}>
                  {v.skipped ? '접종 안함' : v.date || '미접종'}
                </Text>
                <Image
                  source={require('../assets/calendar.png')}
                  style={styles.calendarIcon}
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.label}>기저질환 및 알러지</Text>
        <View style={styles.field}>
          <TextInput
            placeholder="입력 후 확인하면 아래에 기록돼요"
            placeholderTextColor="#B4B4B4"
            style={styles.input}
            value={newCondition}
            onChangeText={setNewCondition}
            onSubmitEditing={submitCondition}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Pressable hitSlop={8} onPress={submitCondition} disabled={!newCondition.trim()}>
            <Text style={[styles.conditionAdd, !newCondition.trim() && { opacity: 0.4 }]}>추가</Text>
          </Pressable>
        </View>
        {conditions.length > 0 && (
          <View style={styles.conditionList}>
            {conditions.map((c, i) => (
              <View key={`${c}-${i}`} style={[styles.conditionRow, i > 0 && styles.conditionBorder]}>
                <Text style={styles.conditionDot}>•</Text>
                <Text style={styles.conditionText}>{c}</Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => removeCondition(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c} 삭제`}
                >
                  <Text style={styles.conditionClose}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.section, { marginTop: 30 }]}>고정 프리셋</Text>
        <Text style={styles.recurringHint}>
          목표 시간을 설정하면 30분 전 알림을 보내드려요!
        </Text>
        <View style={styles.recurringCard}>
          {TODO_PRESETS.map((p, i) => {
            const todo = todos.find((t) => t.label === p.label);
            const time = todo?.targetTime ?? null;
            return (
              <View key={p.key} style={[styles.presetRow, i > 0 && styles.recurringBorder]}>
                <Text style={styles.recurringLabel}>{p.label}</Text>
                <Pressable style={styles.presetTimeBtn} onPress={() => openPresetTime(p.label, time)}>
                  <Text style={[styles.presetTimeText, !time && styles.presetTimePlaceholder]}>
                    {time ?? '시간 설정'}
                  </Text>
                </Pressable>
                {time ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() => setPresetTime(p.label, null)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label} 시간 해제`}
                  >
                    <Text style={styles.recurringClose}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {recurringTodos.map((r) => {
            const todo = todos.find((t) => t.label === r.label);
            const time = todo?.targetTime ?? null;
            return (
              <View key={r.id} style={[styles.presetRow, styles.recurringBorder]}>
                <Text style={styles.recurringLabel}>{r.label}</Text>
                <Pressable style={styles.presetTimeBtn} onPress={() => openPresetTime(r.label, time)}>
                  <Text style={[styles.presetTimeText, !time && styles.presetTimePlaceholder]}>
                    {time ?? '시간 설정'}
                  </Text>
                </Pressable>
                {time ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() => setPresetTime(r.label, null)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.label} 시간 해제`}
                  >
                    <Text style={styles.recurringClose}>×</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  hitSlop={8}
                  onPress={() => removeRecurringTodo(r.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.label} 프리셋 삭제`}
                >
                  <Text style={styles.presetRemoveText}>삭제</Text>
                </Pressable>
              </View>
            );
          })}
          <View style={[styles.recurringAddRow, (TODO_PRESETS.length > 0 || recurringTodos.length > 0) && styles.recurringBorder]}>
            <Text style={styles.recurringPlus}>+</Text>
            <TextInput
              placeholder="커스텀 프리셋 추가"
              placeholderTextColor="#B4B4B4"
              style={styles.recurringInput}
              value={newPresetLabel}
              onChangeText={setNewPresetLabel}
              onSubmitEditing={submitCustomPreset}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable hitSlop={8} onPress={submitCustomPreset} disabled={!newPresetLabel.trim()}>
              <Text style={[styles.conditionAdd, !newPresetLabel.trim() && { opacity: 0.4 }]}>추가</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.section, { marginTop: 30 }]}>고양이 프로필 생성</Text>
        <View style={styles.profileCreate}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileLead}>함께할 고양이를 등록해주세요.</Text>
            <Text style={styles.profileSub}>
              고양이 사진을 등록하면{'\n'}AI가 특징을 분석해{'\n'}하나뿐인 캐릭터를 만들어드려요.
            </Text>
            <Pressable
              style={[styles.pickBtn, catGenRunning && { opacity: 0.4 }]}
              onPress={onPickPhoto}
              hitSlop={8}
              disabled={catGenRunning}
            >
              <Image source={require('../assets/camera.png')} style={styles.cameraIcon} resizeMode="contain" />
              <Text style={styles.pickText}>
                {cat?.photoUri ? '사진 다시 선택' : '사진 등록하기'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.charCircle}>
            <Image source={profileCharSource} style={styles.charImage} resizeMode="cover" />
            {catGenRunning && (
              <View style={styles.charOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>
        </View>

        {/* 사진이 있으면 AI 캐릭터 생성/재생성 가능 */}
        {cat?.photoUri && (
          <View style={styles.genArea}>
            {catGenRunning ? (
              <>
                <Text style={styles.genProgress}>{catGen.step || '준비 중...'}</Text>
                <Text style={styles.genNote}>캐릭터 생성은 몇 분 정도 걸릴 수 있어요.</Text>
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.genBtn, pressed && { opacity: 0.85 }]}
                onPress={handleGenerate}
              >
                <Text style={styles.genBtnText}>
                  {catGen.status === 'error'
                    ? '다시 시도하기'
                    : cat?.generated
                    ? 'AI 캐릭터 다시 만들기'
                    : '✨ AI 캐릭터 만들기'}
                </Text>
              </Pressable>
            )}
            {catGen.status === 'error' && !!catGen.error && (
              <Text style={styles.genError}>{catGen.error}</Text>
            )}
          </View>
        )}

        {/* 생성된 캐릭터 3종 미리보기 */}
        {generated && (
          <View style={styles.genThumbRow}>
            {GENERATED_EMOTIONS.map(({ key, label }) => (
              <View key={key} style={styles.genThumbItem}>
                <View style={styles.genThumbCircle}>
                  <Image source={{ uri: generated[key] }} style={styles.genThumbImg} resizeMode="cover" />
                </View>
                <Text style={styles.genThumbLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.section, { marginTop: 30 }]}>가족 초대</Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteLink} numberOfLines={1}>
            초대 코드: {inviteCode}
          </Text>
          <Pressable
            style={[styles.invitePill, copied && { backgroundColor: colors.primary }]}
            hitSlop={6}
            onPress={handleCopyInvite}
          >
            <Text style={[styles.invitePillText, copied && { color: '#fff' }]}>
              {copied ? '복사됨!' : '복사하기'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.joinRow}>
          <TextInput
            style={styles.joinInput}
            placeholder="다른 가족의 초대 코드 입력"
            placeholderTextColor="#B4B4B4"
            autoCapitalize="characters"
            autoCorrect={false}
            value={joinCode}
            onChangeText={setJoinCode}
          />
          <Pressable
            style={[styles.joinBtn, (!joinCode.trim() || joining) && { opacity: 0.4 }]}
            disabled={!joinCode.trim() || joining}
            onPress={handleJoin}
          >
            <Text style={styles.joinBtnText}>{joining ? '합류 중…' : '합류'}</Text>
          </Pressable>
        </View>
        {/* <Text style={styles.joinHint}>코드를 입력하면 그 가족의 고양이·할 일과 동기화돼요.</Text> */}
        {/* <Text style={styles.copyHint}>꾹 눌러서 복사 (미구현)</Text> */}

        <Text style={[styles.section, { marginTop: 30 }]}>앱 설정</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.subLabel}>알림 설정</Text>
          {NOTI_KEYS.map(({ key, label, icon }) => (
            <View key={key} style={styles.notiRow}>
              <Image source={icon} style={styles.notiIcon} resizeMode="contain" />
              <Text style={styles.notiLabel}>{label}</Text>
              <Toggle
                value={notifications[key]}
                onValueChange={(v) => setNotification(key, v)}
              />
            </View>
          ))}
          {/* <Text style={styles.notiHint}>
            켜두면, "고정 프리셋"에 설정한 목표 시간 30분 전에 휴대폰 알림을 보냅니다.{'\n'}
            "기타 알림"은 프리셋 외에 목표 시간을 설정한 할 일에도 30분 전 알림을 보냅니다.
          </Text> */}
        </View>

        <Pressable style={styles.logout} onPress={handleLogout} hitSlop={8}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      {/* 중성화 여부 — 휠 스크롤 선택 */}
      <Modal
        visible={showNeutered}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNeutered(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowNeutered(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Pressable hitSlop={8} onPress={() => setShowNeutered(false)}>
              <Text style={styles.sheetCancel}>취소</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>중성화 수술 여부</Text>
            <Pressable hitSlop={8} onPress={confirmNeutered}>
              <Text style={styles.sheetDone}>완료</Text>
            </Pressable>
          </View>
          <View style={styles.wheelRow}>
            <WheelPicker
              items={neuteredItems}
              selectedValue={tempNeutered}
              onChange={(v) => setTempNeutered(v as '했어요' | '안 했어요')}
            />
          </View>
        </View>
      </Modal>

      {/* 예방접종 날짜 — 노란색 휠 시트 (iOS/Android 공통) */}
      <Modal
        visible={dateTarget != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDateTarget(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setDateTarget(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Pressable hitSlop={8} onPress={() => setDateTarget(null)}>
              <Text style={styles.sheetCancel}>취소</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>접종 날짜</Text>
            <Pressable hitSlop={8} onPress={confirmDate}>
              <Text style={styles.sheetDone}>완료</Text>
            </Pressable>
          </View>
          <View style={styles.wheelRow}>
            <WheelPicker items={yearItems} selectedValue={tYear} onChange={setYear} />
            <WheelPicker items={monthItems} selectedValue={tMonth} onChange={setMonth} />
            <WheelPicker items={dayItems} selectedValue={tDay} onChange={setDay} />
          </View>
          <View style={styles.vaccineActionRow}>
            <Pressable style={styles.vaccineActionBtn} onPress={clearVaccine}>
              <Text style={styles.vaccineActionText}>미접종</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 고정 프리셋 목표 시간 — 휠 시트 */}
      <Modal
        visible={presetSheetFor != null}
        transparent
        animationType="slide"
        onRequestClose={() => setPresetSheetFor(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPresetSheetFor(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Pressable hitSlop={8} onPress={() => setPresetSheetFor(null)}>
              <Text style={styles.sheetCancel}>취소</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{presetSheetFor} 목표 시간</Text>
            <Pressable hitSlop={8} onPress={confirmPresetTime}>
              <Text style={styles.sheetDone}>완료</Text>
            </Pressable>
          </View>
          <View style={styles.wheelRow}>
            <WheelPicker items={hourItems} selectedValue={tempHour} onChange={setTempHour} />
            <WheelPicker items={minuteItems} selectedValue={tempMin} onChange={setTempMin} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const FIELD_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  backBtn: {
    height: 52,
    justifyContent: 'center',
    paddingRight: 4,
  },
  backIcon: {
    fontSize: 30,
    lineHeight: 34,
    color: colors.primaryDark,
    fontFamily: fontFamily.semibold,
  },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: 30, color: colors.primaryDark },
  headerLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.slate200 },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  section: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  field: {
    minHeight: 43,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...FIELD_SHADOW,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: 0,
  },
  suffix: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textPrimary },
  placeholder: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#B4B4B4' },
  value: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  chevron: { fontSize: 18, color: colors.textSecondary, marginTop: -6 },
  vaccineBox: {
    minHeight: 43,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    ...FIELD_SHADOW,
  },
  vaccineLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  vaccineDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // 날짜 칸 고정 폭(좌측 정렬) — 어떤 값이든 달력 아이콘 위치 동일
  vaccineDateText: { width: 92, textAlign: 'left' },
  calendarIcon: { width: 16, height: 16 },
  recurringHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: -6,
    marginBottom: 10,
  },
  recurringCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    ...FIELD_SHADOW,
  },
  recurringEmpty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#B4B4B4',
    paddingVertical: 14,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  recurringBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate200 },
  recurringLabel: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary },
  recurringClose: { fontSize: 18, color: colors.textSecondary, paddingHorizontal: 2 },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  presetTimeBtn: {
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetTimeText: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.primaryDark },
  presetTimePlaceholder: { color: '#B4B4B4' },
  presetRemoveText: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  notiHint: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 16, color: '#A0A0A0' },
  recurringAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  recurringPlus: { fontSize: 16, color: colors.primaryDark },
  recurringInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  profileCreate: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    ...FIELD_SHADOW,
  },
  profileLead: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  profileSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  cameraIcon: { width: 18, height: 18 },
  pickText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primaryDark },
  charCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    alignSelf: 'center',
    marginLeft: 8,
  },
  charImage: { width: '100%', height: '100%' },
  charOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genArea: { alignItems: 'center', marginTop: 14, gap: 8 },
  genBtn: {
    height: 46,
    minWidth: 220,
    paddingHorizontal: 24,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.white },
  genProgress: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  genNote: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: '#B4B4B4',
    textAlign: 'center',
  },
  genError: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#E2483D',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  genThumbRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 16 },
  genThumbItem: { alignItems: 'center', gap: 6 },
  genThumbCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate100,
  },
  genThumbImg: { width: '100%', height: '100%' },
  genThumbLabel: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 6,
    height: 40,
    ...FIELD_SHADOW,
  },
  inviteLink: { flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: '#6B6B6B' },
  invitePill: {
    backgroundColor: '#FFE1A9',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  invitePillText: { fontFamily: fontFamily.regular, fontSize: 10, color: '#474747' },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  joinInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  joinBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.white },
  joinHint: { fontFamily: fontFamily.regular, fontSize: 10, color: '#A0A0A0', marginTop: 6 },
  copyHint: {
    fontFamily: fontFamily.regular,
    fontSize: 8,
    color: '#818181',
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 8,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 18,
    ...FIELD_SHADOW,
  },
  subLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  notiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  notiIcon: { width: 22, height: 22 },
  notiLabel: { flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary },
  logout: { alignSelf: 'center', marginTop: 20 },
  logoutText: { fontFamily: fontFamily.regular, fontSize: 14, color: '#818181', textAlign: 'center' },

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
  vaccineActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 4,
  },
  vaccineActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaccineActionText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary },
  conditionAdd: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.primaryDark },
  conditionList: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    ...FIELD_SHADOW,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  conditionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate200 },
  conditionDot: { fontSize: 14, color: colors.primaryDark },
  conditionText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary },
  conditionClose: { fontSize: 18, color: colors.textSecondary, paddingHorizontal: 2 },
});
