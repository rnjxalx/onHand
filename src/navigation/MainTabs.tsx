import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CareScreen } from '../screens/CareScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { MyScreen } from '../screens/MyScreen';
import { TabBar, TabKey } from '../components';
import type { RootStackParamList } from './RootNavigator';

export type MainTabParamList = {
  home: undefined;
  care: undefined;
  calendar: undefined;
  my: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const active = state.routes[state.index].name as TabKey;
  return (
    <TabBar active={active} onChange={(key) => navigation.navigate(key)} />
  );
}

function MyTab() {
  // useNavigation 으로 루트 네비게이터에 직접 접근 → getParent() null 가능성 제거
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <MyScreen
      onSettings={() => rootNav.navigate('MySettings')}
      onAddMemory={() => rootNav.navigate('CatRegisterCamera', { target: 'memory' })}
    />
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="home">{() => <HomeScreen />}</Tab.Screen>
      <Tab.Screen name="care" component={CareScreen} />
      <Tab.Screen name="calendar" component={CalendarScreen} />
      <Tab.Screen name="my" component={MyTab} />
    </Tab.Navigator>
  );
}
