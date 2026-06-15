import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppProvider } from './src/store';

/** 개발용 에러 경계 — 렌더 단계 오류를 화면에 표시 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <ErrorView error={this.state.error} label="Render Error" />;
    }
    return this.props.children;
  }
}

function ErrorView({ error, label }: { error: Error; label: string }) {
  return (
    <View style={s.errWrap}>
      <Text style={s.errTitle}>🔴 {label}</Text>
      <Text style={s.errMsg}>{error?.message ?? String(error)}</Text>
      <ScrollView>
        <Text style={s.errStack}>{error?.stack ?? '(no stack)'}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  errWrap: { flex: 1, backgroundColor: '#1e1e1e', padding: 24, paddingTop: 70 },
  errTitle: { fontSize: 18, fontWeight: 'bold', color: '#ff6b6b', marginBottom: 12 },
  errMsg: { fontSize: 14, color: '#ffd700', marginBottom: 16, lineHeight: 20 },
  errStack: { fontSize: 11, color: '#aaa', lineHeight: 16 },
  loading: { flex: 1, backgroundColor: '#FFFFFF' },
});

export default function App() {
  // 앱 전역 글꼴 Inter 로드 (theme의 fontFamily 토큰명과 매핑)
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return <View style={s.loading} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
