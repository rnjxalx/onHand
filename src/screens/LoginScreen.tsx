import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { TextField, Checkbox } from '../components';
import { useApp } from '../store';

interface LoginScreenProps {
  onLoggedIn?: (hasCat: boolean) => void;
  onSignup?: () => void;
  onForgotPassword?: () => void;
}

export function LoginScreen({ onLoggedIn, onSignup, onForgotPassword }: LoginScreenProps) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await login({ email, password, keepLoggedIn });
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert('로그인 실패', result.error);
      return;
    }
    onLoggedIn?.(result.hasCat);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/app-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.form}>
          <TextField
            placeholder="이메일"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            placeholder="비밀번호"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            containerStyle={{ marginTop: 12 }}
          />

          <Pressable
            style={styles.keepRow}
            onPress={() => setKeepLoggedIn((v) => !v)}
          >
            <Checkbox checked={keepLoggedIn} onToggle={setKeepLoggedIn} size={14} />
            <Text style={styles.keepText}>로그인 상태 유지</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.loginBtn, (pressed || submitting) && { opacity: 0.85 }]}
            disabled={submitting}
            onPress={handleLogin}
          >
            <Text style={styles.loginText}>{submitting ? '로그인 중…' : '로그인'}</Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable onPress={onSignup}>
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>
            <Text style={styles.linkDivider}>|</Text>
            <Pressable onPress={onForgotPassword}>
              <Text style={styles.linkText}>비밀번호 찾기</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, paddingHorizontal: 36 },
  logoWrap: { alignItems: 'center', marginTop: 120, marginBottom: 56 },
  logo: { width: 198, height: 198 },
  form: { width: '100%' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  keepText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPrimary },
  loginBtn: {
    height: 44,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.white },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  linkText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#BABABA' },
  linkDivider: { fontSize: fontSize.xs, color: '#BABABA' },
});
