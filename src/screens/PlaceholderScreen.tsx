import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';

interface PlaceholderScreenProps {
  title: string;
}

/**
 * PlaceholderScreen — 아직 구현되지 않은 화면용 임시 화면
 * (케어 / 캘린더 / MY 등)
 */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>준비 중인 화면입니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize['3xl'],
    color: colors.primary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
