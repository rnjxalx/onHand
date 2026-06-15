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
import { TextField } from '../components';
import { useApp } from '../store';

interface ForgotPasswordScreenProps {
  onSubmit?: (email: string) => void;
}

export function ForgotPasswordScreen({ onSubmit }: ForgotPasswordScreenProps) {
  const { accounts } = useApp();
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    const cleaned = email.trim().toLowerCase();
    if (!/^.+@.+\..+$/.test(cleaned)) {
      Alert.alert('알림', '올바른 이메일을 입력해주세요.');
      return;
    }
    const exists = accounts.some((a) => a.email === cleaned);
    if (!exists) {
      Alert.alert('알림', '가입된 계정을 찾을 수 없어요.');
      return;
    }
    onSubmit?.(cleaned);
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

        <Text style={styles.info}>
          가입 시 사용한 이메일을 입력해주세요.{'\n'}
          비밀번호 재설정 메일을 보내드립니다.
        </Text>

        <View style={styles.form}>
          <TextField
            placeholder="이메일"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>비밀번호 재설정하기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 36,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 24,
  },
  logo: {
    width: 198,
    height: 198,
  },
  info: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    height: 44,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.white,
  },
});
