import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { useApp } from '../store';

interface CatRegisterCharacterScreenProps {
  onPickPhoto?: () => void;
  onStart?: () => void;
}

const EMOTION_PREVIEW: { key: 'basic' | 'happy' | 'sad'; label: string }[] = [
  { key: 'basic', label: '기본' },
  { key: 'happy', label: '행복' },
  { key: 'sad', label: '슬픔' },
];

export function CatRegisterCharacterScreen({
  onPickPhoto,
  onStart,
}: CatRegisterCharacterScreenProps) {
  const { cat, catGen, generateCatCharacters } = useApp();

  const generated = cat?.generated ?? null;
  const running = catGen.status === 'running';
  const hasPhoto = !!cat?.photoUri;

  // 미리보기는 생성된 기본 캐릭터 > 원본 사진 > 샘플 순으로 보여준다.
  const previewSource = generated?.basic
    ? { uri: generated.basic }
    : cat?.photoUri
    ? { uri: cat.photoUri }
    : require('../assets/cat-character-sample.png');

  const handleGenerate = () => {
    if (cat?.photoUri && !running) generateCatCharacters(cat.photoUri);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>고양이 등록</Text>
        <Text style={styles.subtitle}>함께할 고양이를 알려주세요</Text>
        <View style={styles.divider} />

        <Text style={styles.lead}>
          고양이 사진을 등록하면{'\n'}
          AI가 특징을 분석해{'\n'}
          하나뿐인 캐릭터를 만들어드려요.
        </Text>

        <View style={styles.previewWrap}>
          <View style={styles.previewCircle}>
            <Image
              source={previewSource}
              style={styles.previewImage}
              resizeMode="cover"
            />
            {running && (
              <View style={styles.previewOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>

          {!running && (
            <Pressable style={styles.pickBtn} onPress={onPickPhoto} hitSlop={8}>
              <Image
                source={require('../assets/camera.png')}
                style={styles.cameraIcon}
                resizeMode="contain"
              />
              <Text style={styles.pickText}>
                {hasPhoto ? '사진 다시 선택' : '사진 등록하기'}
              </Text>
            </Pressable>
          )}

          {/* 생성 진행 / 결과 / 실행 영역 */}
          {running ? (
            <View style={styles.statusBox}>
              <Text style={styles.progressText}>{catGen.step || '준비 중...'}</Text>
              <View style={styles.dotsRow}>
                {Array.from({ length: catGen.total }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i < catGen.progress && styles.dotActive]}
                  />
                ))}
              </View>
              <Text style={styles.progressNote}>
                캐릭터 생성은 몇 분 정도 걸릴 수 있어요.
              </Text>
            </View>
          ) : generated && catGen.status !== 'error' ? (
            <View style={styles.statusBox}>
              <View style={styles.emotionRow}>
                {EMOTION_PREVIEW.map(({ key, label }) => (
                  <View key={key} style={styles.emotionItem}>
                    <View style={styles.emotionThumbWrap}>
                      <Image
                        source={{ uri: generated[key] }}
                        style={styles.emotionThumb}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={styles.emotionLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              <Pressable style={styles.genGhostBtn} onPress={handleGenerate} hitSlop={8}>
                <Text style={styles.genGhostText}>캐릭터 다시 만들기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.statusBox}>
              {catGen.status === 'error' && !!catGen.error && (
                <Text style={styles.errorText}>{catGen.error}</Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.genBtn,
                  !hasPhoto && styles.genBtnDisabled,
                  pressed && hasPhoto && { opacity: 0.85 },
                ]}
                onPress={handleGenerate}
                disabled={!hasPhoto}
              >
                <Text style={styles.genBtnText}>
                  {catGen.status === 'error'
                    ? '다시 시도하기'
                    : '✨ AI 캐릭터 만들기'}
                </Text>
              </Pressable>
              {!hasPhoto && (
                <Text style={styles.tip}>
                  Tip. 정면 얼굴이 잘 보이는 사진일수록{'\n'}
                  더 정확한 캐릭터가 생성돼요.
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
          onPress={onStart}
        >
          <Text style={styles.startText}>시작하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontFamily: fontFamily.semibold, fontSize: 24, color: colors.textPrimary },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
    marginBottom: 24,
  },
  lead: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  previewCircle: {
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate100,
  },
  previewImage: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cameraIcon: { width: 18, height: 18 },
  pickText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primaryDark },

  statusBox: { alignItems: 'center', gap: 12, width: '100%' },

  // 진행 상태
  progressText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate200,
  },
  dotActive: { backgroundColor: colors.primary },
  progressNote: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 15,
    color: '#B4B4B4',
    textAlign: 'center',
  },

  // 생성 결과(감정 미리보기)
  emotionRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  emotionItem: { alignItems: 'center', gap: 6 },
  emotionThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate100,
  },
  emotionThumb: { width: '100%', height: '100%' },
  emotionLabel: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary },
  genGhostBtn: { paddingVertical: 4 },
  genGhostText: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.primaryDark },

  // 생성 실행 버튼
  genBtn: {
    height: 46,
    minWidth: 200,
    paddingHorizontal: 24,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genBtnDisabled: { backgroundColor: colors.slate200 },
  genBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.white },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#E2483D',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  tip: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 15,
    color: '#B4B4B4',
    textAlign: 'center',
  },

  footer: { paddingHorizontal: 41, paddingBottom: 24, paddingTop: 8 },
  startBtn: {
    height: 63,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { fontFamily: fontFamily.medium, fontSize: fontSize.xl, color: colors.white },
});
