import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily } from '../theme';

interface SplashScreenProps {
  onFinish?: () => void;
  delay?: number;
}

/**
 * SplashScreen — 로고 표시 후 delay(ms) 경과 시 onFinish 호출.
 * ready 대기 로직은 RootNavigator 에서 처리한다.
 */
export function SplashScreen({ onFinish, delay = 1800 }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(() => onFinish?.(), delay);
    return () => clearTimeout(t);
  }, [onFinish, delay]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Image
          source={require('../assets/app-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 280, height: 280 },
  wordmark: {
    fontFamily: fontFamily.semibold,
    fontSize: 25,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 36,
  },
});
