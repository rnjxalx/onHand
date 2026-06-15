import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { useApp } from '../store';

interface CatRegisterScreenProps {
  onNext?: () => void;
  onExisting?: () => void;
}

export interface CatBasicInfo {
  name: string;
  birthday: string;
  breed: string;
  gender: '남아' | '여아' | '';
}

export function CatRegisterScreen({ onNext, onExisting }: CatRegisterScreenProps) {
  const { cat, saveCatBasic } = useApp();
  const [name, setName] = useState(cat?.name ?? '');
  const [birthday, setBirthday] = useState(cat?.birthday ?? '');
  const [breed, setBreed] = useState(cat?.breed ?? '');
  const [gender, setGender] = useState<CatBasicInfo['gender']>(cat?.gender ?? '');

  const toggleGender = () =>
    setGender((g) => (g === '남아' ? '여아' : g === '여아' ? '' : '남아'));

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '고양이 이름을 입력해주세요.');
      return;
    }
    await saveCatBasic({
      name: name.trim(),
      birthday,
      breed: breed.trim(),
      gender,
    });
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

          <Text style={styles.section}>기본 정보</Text>

          <Text style={styles.label}>고양이 이름</Text>
          <View style={styles.field}>
            <TextInput
              placeholder="이름"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.label}>생년월일</Text>
          <View style={styles.field}>
            <TextInput
              placeholder="YYYY.MM.DD"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              value={birthday}
              onChangeText={setBirthday}
            />
          </View>
          <Text style={styles.note}>
            * 정확한 생일을 모른다면 만난 날을 적어주셔도 좋아요.
          </Text>

          <Text style={styles.label}>품종</Text>
          <View style={styles.field}>
            <TextInput
              placeholder="품종"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              value={breed}
              onChangeText={setBreed}
            />
          </View>

          <Text style={styles.label}>성별</Text>
          <Pressable style={styles.field} onPress={toggleGender}>
            <Text style={gender ? styles.value : styles.placeholder}>
              {gender || '성별'}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <Pressable hitSlop={8} style={styles.existingLink} onPress={onExisting}>
            <Text style={styles.existingText}>이미 등록한 고양이가 있나요?</Text>
          </Pressable>
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
    minHeight: 42,
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
  placeholder: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#B4B4B4' },
  value: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  chevron: { fontSize: 18, color: colors.textSecondary, marginTop: -6 },
  note: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textPrimary,
    marginTop: 6,
  },
  existingLink: { alignSelf: 'flex-end', marginTop: 16 },
  existingText: { fontFamily: fontFamily.regular, fontSize: 10, color: '#B4B4B4' },
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
