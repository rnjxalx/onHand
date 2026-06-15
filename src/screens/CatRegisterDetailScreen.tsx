import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { Checkbox } from '../components';
import { useApp } from '../store';

interface CatRegisterDetailScreenProps {
  onNext?: () => void;
}

const VACCINE_LABELS = ['1차 접종 완료', '2차 접종 완료', '3차 접종 완료'];

function todayStr(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

export function CatRegisterDetailScreen({ onNext }: CatRegisterDetailScreenProps) {
  const { cat, saveCatDetail } = useApp();
  const [neutered, setNeutered] = useState<'' | '했어요' | '안 했어요'>(cat?.neutered ?? '');
  const [weight, setWeight] = useState(cat?.weight ?? '');
  const initialVaccines = VACCINE_LABELS.map((label, i) => {
    const existing = cat?.vaccines?.[i];
    return {
      label,
      done: existing?.done ?? false,
      date: existing?.date ?? '',
    };
  });
  const [vaccines, setVaccines] = useState(initialVaccines);
  const [condition, setCondition] = useState(cat?.condition ?? '');

  // 폰 기본 선택 UI(iOS 액션시트 / Android 다이얼로그)에서 한 가지를 고른다.
  const pickNeutered = () => {
    const opts: ('했어요' | '안 했어요')[] = ['했어요', '안 했어요'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: '중성화 수술 여부', options: [...opts, '취소'], cancelButtonIndex: 2 },
        (i) => {
          if (i != null && i < opts.length) setNeutered(opts[i]);
        },
      );
    } else {
      Alert.alert('중성화 수술 여부', undefined, [
        { text: '했어요', onPress: () => setNeutered('했어요') },
        { text: '안 했어요', onPress: () => setNeutered('안 했어요') },
        { text: '취소', style: 'cancel' },
      ]);
    }
  };

  const toggleVaccine = (i: number) =>
    setVaccines((prev) =>
      prev.map((v, idx) => {
        if (idx !== i) return v;
        const next = !v.done;
        return { ...v, done: next, date: next ? v.date || todayStr() : v.date };
      }),
    );

  const handleNext = async () => {
    await saveCatDetail({ neutered, weight: weight.trim(), vaccines, condition: condition.trim() });
    onNext?.();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>고양이 등록</Text>
          <Text style={styles.subtitle}>함께할 고양이를 알려주세요</Text>
          <View style={styles.divider} />

          <Text style={styles.section}>상세 정보</Text>

          <Text style={styles.label}>중성화 수술 여부</Text>
          <Pressable style={styles.field} onPress={pickNeutered}>
            <Text style={neutered ? styles.value : styles.placeholder}>
              {neutered || '중성화 수술 여부'}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <Text style={styles.label}>현재 몸무게</Text>
          <View style={styles.field}>
            <TextInput
              placeholder="00.0"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Text style={styles.suffix}>Kg</Text>
          </View>

          <Text style={styles.label}>예방접종</Text>
          {vaccines.map((v, i) => (
            <View key={v.label} style={styles.vaccineRow}>
              <Checkbox
                checked={v.done}
                onToggle={() => toggleVaccine(i)}
                size={16}
              />
              <View style={styles.vaccineBox}>
                <Text style={styles.vaccineLabel}>{v.label}</Text>
                <View style={styles.vaccineDate}>
                  <Text style={v.done ? styles.value : styles.placeholder}>
                    {v.date || 'YYYY.MM.DD'}
                  </Text>
                  <Image
                    source={require('../assets/calendar.png')}
                    style={styles.calendarIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          ))}

          <Text style={styles.label}>기저질환 및 알러지</Text>
          <View style={styles.field}>
            <TextInput
              placeholder="기저질환 및 알러지"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              value={condition}
              onChangeText={setCondition}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>다음</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontFamily: fontFamily.semibold, fontSize: 24, color: colors.textPrimary },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
    marginBottom: 16,
  },
  section: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  field: {
    minHeight: 43,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: 0,
  },
  suffix: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  placeholder: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#B4B4B4' },
  value: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  chevron: { fontSize: 18, color: colors.textSecondary, marginTop: -6 },
  vaccineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  vaccineBox: {
    flex: 1,
    minHeight: 43,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  vaccineLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  vaccineDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarIcon: { width: 16, height: 16 },
  footer: { paddingHorizontal: 41, paddingBottom: 24, paddingTop: 8 },
  nextBtn: {
    height: 63,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { fontFamily: fontFamily.medium, fontSize: fontSize.xl, color: colors.white },
});
