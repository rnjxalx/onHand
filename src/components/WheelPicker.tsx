import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, fontFamily } from '../theme';

export interface WheelItem<T extends string | number = number> {
  label: string;
  value: T;
}

interface WheelPickerProps<T extends string | number> {
  items: WheelItem<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  itemHeight?: number;
  visibleCount?: number; // 홀수 권장
}

/**
 * WheelPicker — ScrollView 스냅 기반의 위아래 스크롤 휠.
 * iOS/Android 동일하게 동작하며(Expo Go OK), 가운데 항목이 선택값.
 * 중앙 강조 밴드는 앱 메인 노란색. 값은 숫자/문자열 모두 가능.
 */
export function WheelPicker<T extends string | number>({
  items,
  selectedValue,
  onChange,
  itemHeight = 40,
  visibleCount = 5,
}: WheelPickerProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, items.findIndex((it) => it.value === selectedValue));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const padCount = Math.floor(visibleCount / 2);
  const pad = padCount * itemHeight;
  const height = visibleCount * itemHeight;

  // 외부에서 selectedValue가 바뀌면(예: 월 변경으로 일(日)이 보정될 때) 스크롤 위치 동기화
  useEffect(() => {
    const idx = items.findIndex((it) => it.value === selectedValue);
    if (idx >= 0) {
      setActiveIndex(idx);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: false }),
      );
    }
    // items 식별자는 매 렌더 바뀔 수 있어 deps에서 제외 (selectedValue 기준으로만 동기화)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, itemHeight]);

  const indexFromOffset = (y: number) =>
    Math.max(0, Math.min(items.length - 1, Math.round(y / itemHeight)));

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = indexFromOffset(e.nativeEvent.contentOffset.y);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const handleSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = indexFromOffset(e.nativeEvent.contentOffset.y);
    setActiveIndex(idx);
    const val = items[idx]?.value;
    if (val != null && val !== selectedValue) onChange(val);
  };

  return (
    <View style={{ height, flex: 1 }}>
      <View pointerEvents="none" style={[styles.band, { top: pad, height: itemHeight }]} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleSettle}
        onScrollEndDrag={handleSettle}
        contentOffset={{ x: 0, y: initialIndex * itemHeight }}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {items.map((it, i) => (
          <View key={it.value} style={[styles.item, { height: itemHeight }]}>
            <Text style={[styles.itemText, i === activeIndex && styles.itemTextActive]}>
              {it.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 6,
    right: 6,
    backgroundColor: 'rgba(240,174,41,0.16)',
    borderRadius: 8,
  },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: fontFamily.regular, fontSize: 18, color: '#B4B4B4' },
  itemTextActive: { fontFamily: fontFamily.semibold, fontSize: 20, color: colors.primaryDark },
});
