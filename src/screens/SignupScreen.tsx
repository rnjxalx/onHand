import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { TextField, Checkbox } from '../components';
import { useApp } from '../store';

interface SignupScreenProps {
  onSignedUp?: (joined: boolean) => void;
  onBack?: () => void;
}

export function SignupScreen({ onSignedUp, onBack }: SignupScreenProps) {
  const { signup } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const res = await signup({ name, email, password, keepLoggedIn, inviteCode });
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('회원가입 실패', res.error);
      return;
    }
    if (res.joinError) Alert.alert('알림', res.joinError);
    onSignedUp?.(res.joined);
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
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/app-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>
            On Hand와 함께 스마트한 집사 생활을 시작하세요!
          </Text>
          <Text style={styles.subtitle}>
            체계적인 개인 기록부터 실시간 가족 공유까지
          </Text>

          <View style={styles.form}>
            <TextField placeholder="집사 이름 (내 이름)" autoCapitalize="words" value={name} onChangeText={setName} />
            <TextField
              placeholder="이메일"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              containerStyle={{ marginTop: 12 }}
            />
            <TextField
              placeholder="비밀번호 (6자 이상)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              containerStyle={{ marginTop: 12 }}
            />
            <TextField
              placeholder="가족 초대 코드 (선택)"
              autoCapitalize="characters"
              autoCorrect={false}
              value={inviteCode}
              onChangeText={setInviteCode}
              containerStyle={{ marginTop: 12 }}
            />
            <Text style={styles.inviteHint}>
              가족이 공유한 초대 코드가 있으면 입력하세요. 비워두면 새 가족으로 시작해요.
            </Text>

            <Pressable style={styles.keepRow} onPress={() => setKeepLoggedIn((v) => !v)}>
              <Checkbox checked={keepLoggedIn} onToggle={setKeepLoggedIn} size={14} />
              <Text style={styles.keepText}>로그인 상태 유지</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.submitBtn, (pressed || submitting) && { opacity: 0.85 }]}
              disabled={submitting}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>{submitting ? '가입 중…' : '가입하고 시작'}</Text>
            </Pressable>

            <View style={styles.linkRow}>
              <Text style={styles.linkMuted}>이미 계정이 있으신가요?</Text>
              <Pressable onPress={onBack} hitSlop={8}>
                <Text style={styles.linkText}>로그인</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 36, paddingTop: 40, paddingBottom: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 160, height: 160 },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  form: { width: '100%' },
  inviteHint: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 15,
    color: '#A0A0A0',
    marginTop: 6,
  },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  keepText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  submitBtn: {
    height: 44,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitText: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.white },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  linkMuted: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#BABABA' },
  linkText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primaryDark },
});
