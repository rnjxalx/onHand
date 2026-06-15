import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { useApp } from '../store';

interface InviteScreenProps {
  onStart?: (code: string) => void;
  onRegisterCat?: () => void;
}

export function InviteScreen({ onStart, onRegisterCat }: InviteScreenProps) {
  const { inviteCode, joinHouseholdByCode } = useApp();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('알림', '초대 코드를 입력해주세요.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const res = await joinHouseholdByCode(trimmed);
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('알림', res.error);
      return;
    }
    onStart?.(trimmed);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.heading}>초대 코드</Text>
          <Text style={styles.desc}>
            초대 코드를 입력하면{'\n'}
            가족 그룹에 참여할 수 있어요.
          </Text>

          <View style={styles.field}>
            <TextInput
              placeholder="초대 코드를 입력해주세요."
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
            />
          </View>

          <Text style={styles.hint}>이 기기의 초대 코드: {inviteCode}</Text>

          <Pressable hitSlop={8} style={styles.registerLink} onPress={onRegisterCat}>
            <Text style={styles.registerText}>지금 고양이 등록하기</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
            onPress={handleStart}
          >
            <Text style={styles.startText}>시작하기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  field: {
    height: 42,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: 0,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: '#8A8A8A',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  registerLink: { alignSelf: 'flex-end', marginTop: 12 },
  registerText: { fontFamily: fontFamily.regular, fontSize: 10, color: '#B4B4B4' },
  footer: { paddingHorizontal: 41, paddingBottom: 24, paddingTop: 8 },
  startBtn: {
    height: 63,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { fontFamily: fontFamily.medium, fontSize: fontSize.xl, color: colors.white },
});
