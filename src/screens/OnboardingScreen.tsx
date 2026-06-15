import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { useApp } from '../store';

interface OnboardingScreenProps {
  /** 마지막 슬라이드의 "시작" 또는 "건너뛰기" 시 호출 */
  onFinish?: () => void;
}

interface Slide {
  image: ImageSourcePropType;
  title: string;
  description: string;
}

/** Figma 온보딩1~4 (node 1:865 / 1:877 / 1:890 / 1:903) */
const SLIDES: Slide[] = [
  {
    image: require('../assets/onboarding-1.png'),
    title: '우리 아이 맞춤형 루틴 설계',
    description:
      '사냥 놀이부터 영양제까지, 꼭 필요한 일과를 On Hand가 섬세하게 챙겨드려요.',
  },
  {
    image: require('../assets/onboarding-2.png'),
    title: '내 손 안에서 교감하는 AI 캐릭터',
    description:
      '내 아이를 닮은 AI 고양이가 집사의 정성에 반응하며 정서적으로 교감합니다.',
  },
  {
    image: require('../assets/onboarding-3.png'),
    title: '실시간으로 이어지는 공동 집사 생활',
    description:
      '누가 밥을 줬는지 묻지 마세요. 가족의 모든 활동이 즉시 공유되어 중복 급여를 방지합니다.',
  },
  {
    image: require('../assets/onboarding-4.png'),
    title: '한눈에 확인하는 스마트 케어 리포트',
    description:
      '매일의 기록을 분석한 리포트로 우리 아이의 건강 상태를 체계적으로 관리하세요.',
  },
];

/**
 * OnboardingScreen — 가로 스와이프 가능한 4단계 온보딩.
 * 하단에 페이지 인디케이터 + 건너뛰기 + 이전/다음(마지막은 "시작") 버튼.
 */
export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const { markOnboardingSeen } = useApp();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(() => {
    markOnboardingSeen();
    onFinish?.();
  }, [markOnboardingSeen, onFinish]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    [],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(next);
    },
    [width],
  );

  const handleNext = () => {
    if (isLast) finish();
    else goTo(index + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.imageWrap}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      {/* 하단 컨트롤 */}
      <View style={styles.controls}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={i === index ? styles.dotActive : styles.dot} />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Pressable hitSlop={8} onPress={() => finish()}>
            <Text style={styles.skip}>건너뛰기</Text>
          </Pressable>

          <View style={styles.navButtons}>
            {index > 0 && (
              <Pressable
                style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
                onPress={() => goTo(index - 1)}
              >
                <Text style={styles.arrow}>←</Text>
              </Pressable>
            )}
            {isLast ? (
              <Pressable
                style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
                onPress={handleNext}
              >
                <Text style={styles.startText}>시작 →</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
                onPress={handleNext}
              >
                <Text style={styles.arrow}>→</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  image: {
    width: '92%',
    height: '100%',
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    minHeight: 48,
  },
  controls: {
    paddingHorizontal: 36,
    paddingBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E5E5',
  },
  dotActive: {
    width: 36,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#B4B4B4',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: {
    width: 45,
    height: 45,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 20,
    color: colors.white,
    fontFamily: fontFamily.medium,
  },
  startBtn: {
    height: 45,
    paddingHorizontal: 22,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    fontSize: fontSize.base,
    color: colors.white,
    fontFamily: fontFamily.medium,
  },
  pressed: {
    opacity: 0.85,
  },
});
