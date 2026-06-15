import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';

export type TabKey = 'home' | 'care' | 'calendar' | 'my';

interface TabItem {
  key: TabKey;
  label: string;
  iconActive: ImageSourcePropType;
  iconInactive: ImageSourcePropType;
}

const TABS: TabItem[] = [
  {
    key: 'home',
    label: '홈',
    iconActive: require('../assets/tab-home-active.png'),
    iconInactive: require('../assets/tab-home.png'),
  },
  {
    key: 'care',
    label: '케어',
    iconActive: require('../assets/tab-care-active.png'),
    iconInactive: require('../assets/tab-care.png'),
  },
  {
    key: 'calendar',
    label: '캘린더',
    iconActive: require('../assets/tab-calendar-active.png'),
    iconInactive: require('../assets/tab-calendar.png'),
  },
  {
    key: 'my',
    label: 'MY',
    iconActive: require('../assets/tab-my-active.png'),
    iconInactive: require('../assets/tab-my.png'),
  },
];

interface TabBarProps {
  active: TabKey;
  onChange?: (key: TabKey) => void;
}

/**
 * TabBar — 하단 네비게이션 바 (홈 / 케어 / 캘린더 / MY)
 * 활성 탭은 primaryDark(#F0AE29), 비활성은 textSecondary(#666)
 */
export function TabBar({ active, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? colors.primaryDark : colors.textSecondary;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            onPress={() => onChange?.(tab.key)}
            style={styles.item}
          >
            <Image
              source={isActive ? tab.iconActive : tab.iconInactive}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate200,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  icon: {
    width: 28,
    height: 28,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.tab,
  },
});
