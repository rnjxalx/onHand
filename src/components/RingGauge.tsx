import React, { ReactNode } from 'react';
import { View } from 'react-native';

interface RingGaugeProps {
  /** 바깥 지름 */
  size: number;
  /** 링 두께 */
  strokeWidth: number;
  /** 진행도 0..1 */
  progress: number;
  /** 채워진 링 색 */
  color: string;
  /** 비어있는 트랙 색 */
  trackColor: string;
  /** 가운데 컨텐츠 (숫자 등) */
  children?: ReactNode;
}

/**
 * RingGauge — react-native-svg 없이 View 만으로 그리는 원형 게이지.
 * 두 개의 반원 디스크를 회전시켜 0~360° 진행도를 표현하고,
 * 안쪽 흰 원으로 가운데를 비워 링(ring) 모양을 만든다.
 * (카드 배경이 흰색이라 안쪽 원을 흰색으로 채워 도넛처럼 보이게 한다)
 */
export function RingGauge({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  children,
}: RingGaugeProps) {
  const r = size / 2;
  const p = Math.max(0, Math.min(1, progress));
  const deg = p * 360;
  const rightDeg = Math.min(deg, 180); // 0~180° 구간 (오른쪽 반)
  const leftDeg = Math.max(0, deg - 180); // 180~360° 구간 (왼쪽 반)
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 트랙(바탕) 원판 */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: trackColor,
        }}
      />

      {/* 오른쪽 반 (0~180°) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: r,
          width: r,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -r,
            width: r,
            height: size,
            borderTopLeftRadius: r,
            borderBottomLeftRadius: r,
            backgroundColor: color,
            transform: [{ translateX: r / 2 }, { rotate: `${rightDeg}deg` }, { translateX: -r / 2 }],
          }}
        />
      </View>

      {/* 왼쪽 반 (180~360°) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: r,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: r,
            width: r,
            height: size,
            borderTopRightRadius: r,
            borderBottomRightRadius: r,
            backgroundColor: color,
            transform: [{ translateX: -r / 2 }, { rotate: `${leftDeg}deg` }, { translateX: r / 2 }],
          }}
        />
      </View>

      {/* 안쪽 구멍 (흰 원) */}
      <View
        style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: '#FFFFFF',
        }}
      />

      {/* 가운데 컨텐츠 */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
