import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SplashScreen,
  OnboardingScreen,
  PermissionsScreen,
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  ForgotPasswordSentScreen,
  CatRegisterScreen,
  CatRegisterDetailScreen,
  CatRegisterCharacterScreen,
  CatRegisterCameraScreen,
  InviteScreen,
  MySettingsScreen,
} from '../screens';
import { MainTabs } from './MainTabs';
import { useApp } from '../store';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Permissions: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ForgotPasswordSent: undefined;
  CatRegister: undefined;
  CatRegisterDetail: undefined;
  CatRegisterCharacter: undefined;
  CatRegisterCamera: { target?: 'cat' | 'memory' } | undefined;
  Invite: undefined;
  Main: undefined;
  MySettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { ready, hasSeenOnboarding, permissionsAcked, session, cat } = useApp();

  // SplashScreen 의 타이머가 ready 전에 끝나면 여기 저장 후 ready 시 실행
  const pendingNavRef = useRef<((nav: any) => void) | null>(null);
  const navRef = useRef<any>(null);

  // ready 가 true 가 되는 순간 대기 중인 네비게이션이 있으면 실행
  useEffect(() => {
    if (ready && pendingNavRef.current && navRef.current) {
      const fn = pendingNavRef.current;
      pendingNavRef.current = null;
      fn(navRef.current);
    }
  }, [ready]);

  /** 현재 상태를 보고 적절한 화면으로 replace */
  const navigateAfterSplash = (navigation: any) => {
    if (session && cat) {
      navigation.replace('Main');
    } else if (session && !cat) {
      navigation.replace('CatRegister');
    } else if (!hasSeenOnboarding) {
      navigation.replace('Onboarding');
    } else if (!permissionsAcked) {
      navigation.replace('Permissions');
    } else {
      navigation.replace('Login');
    }
  };

  const handleSplashFinish = (navigation: any) => {
    navRef.current = navigation;
    if (ready) {
      navigateAfterSplash(navigation);
    } else {
      // ready 를 아직 기다리는 중 → useEffect 에서 처리
      pendingNavRef.current = navigateAfterSplash;
    }
  };

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen onFinish={() => handleSplashFinish(navigation)} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Onboarding">
        {({ navigation }) => (
          <OnboardingScreen onFinish={() => navigation.replace('Permissions')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Permissions">
        {({ navigation }) => (
          <PermissionsScreen onConfirm={() => navigation.replace('Login')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoggedIn={(hasCat) => navigation.replace(hasCat ? 'Main' : 'CatRegister')}
            onSignup={() => navigation.navigate('Signup')}
            onForgotPassword={() => navigation.navigate('ForgotPassword')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Signup">
        {({ navigation }) => (
          <SignupScreen
            onSignedUp={(joined) => navigation.replace(joined ? 'Main' : 'CatRegister')}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onSubmit={() => navigation.replace('ForgotPasswordSent')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPasswordSent">
        {({ navigation }) => (
          <ForgotPasswordSentScreen
            onConfirm={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CatRegister">
        {({ navigation }) => (
          <CatRegisterScreen
            onNext={() => navigation.navigate('CatRegisterDetail')}
            onExisting={() => navigation.navigate('Invite')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CatRegisterDetail">
        {({ navigation }) => (
          <CatRegisterDetailScreen
            onNext={() => navigation.navigate('CatRegisterCharacter')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CatRegisterCharacter">
        {({ navigation }) => (
          <CatRegisterCharacterScreen
            onPickPhoto={() =>
              navigation.navigate('CatRegisterCamera', { target: 'cat' })
            }
            onStart={() => navigation.replace('Main')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CatRegisterCamera"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        {({ navigation, route }) => (
          <CatRegisterCameraScreen
            target={route.params?.target ?? 'cat'}
            onCaptured={() => navigation.goBack()}
            onClose={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Invite">
        {({ navigation }) => (
          <InviteScreen
            onStart={() => navigation.replace('Main')}
            onRegisterCat={() => navigation.replace('CatRegister')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Main" component={MainTabs} />

      <Stack.Screen name="MySettings">
        {({ navigation }) => (
          <MySettingsScreen
            onBack={() => navigation.goBack()}
            onPickPhoto={() =>
              navigation.navigate('CatRegisterCamera', { target: 'cat' })
            }
            onLoggedOut={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
            }
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
