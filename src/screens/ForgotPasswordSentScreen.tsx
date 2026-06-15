import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily } from '../theme';

interface ForgotPasswordSentScreenProps {
  /** "확인" → 로그인으로 복귀 */
  onConfirm?: () => void;
}

/**
 * ForgotPasswordSentScreen — Figma node 1:960 (비밀번호 재설정)
 * 메일 발송 완료 안내 일러스트 + 문구 + "확인".
 */
export function ForgotPasswordSentScreen({ onConfirm }: ForgotPasswordSentScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Image
          source={require('../assets/forgot-password-sent.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
        <Text style={styles.message}>
          비밀번호 재설정 링크를 보내드렸어요.{'\n'}
          메일함을 확인해주세요.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
          onPress={onConfirm}
        >
          <Text style={styles.confirmText}>확인</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  illustration: {
    width: 216,
    height: 216,
    marginBottom: 8,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    lineHeight: 26,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  confirmBtn: {
    height: 44,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.white,
  },
});
