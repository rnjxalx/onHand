import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize } from '../theme';
import { useApp } from '../store';

interface PermissionsScreenProps {
  /** "확인했습니다" 버튼 → 로그인/다음 단계로 */
  onConfirm?: () => void;
}

interface PermissionItem {
  icon?: string;
  iconImage?: ImageSourcePropType;
  title: string;
  description: string;
}

/** Figma 권한설정 (node 1:916) */
const REQUIRED: PermissionItem[] = [
  {
    icon: '📱',
    title: '기기 및 앱 기록',
    description: '서비스 최적화 및 실시간 데이터 동기화 오류 확인',
  },
];

const OPTIONAL: PermissionItem[] = [
  {
    iconImage: require('../assets/camera.png'),
    title: '카메라 / 사진첩',
    description: 'AI 캐릭터 생성 및 고양이 프로필 사진 등록',
  },
  {
    icon: '🔔',
    title: '알림',
    description: '고양이의 상태 변화와 가족의 케어 활동 실시간 공유',
  },
];

function Row({ item }: { item: PermissionItem }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        {item.iconImage ? (
          <Image source={item.iconImage} style={styles.iconImage} resizeMode="contain" />
        ) : (
          <Text style={styles.icon}>{item.icon}</Text>
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowDesc}>{item.description}</Text>
      </View>
    </View>
  );
}

/**
 * PermissionsScreen — "시작하기 전에" 필수/선택 접근 권한 안내.
 */
export function PermissionsScreen({ onConfirm }: PermissionsScreenProps) {
  const { markPermissionsAcked } = useApp();
  const handleConfirm = () => {
    markPermissionsAcked();
    onConfirm?.();
  };
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>시작하기 전에</Text>
        <Text style={styles.subtitle}>
          더욱 편리하고 똑똑한 케어 관리를 위해 아래 내용을 확인해 주세요.
        </Text>

        <Text style={styles.sectionLabel}>필수적 접근 권한</Text>
        {REQUIRED.map((item) => (
          <Row key={item.title} item={item} />
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>선택적 접근 권한</Text>
        {OPTIONAL.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmText}>확인했습니다</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    paddingHorizontal: 36,
    paddingTop: 48,
    paddingBottom: 24,
  },
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: 30,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  sectionLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  iconImage: {
    width: 28,
    height: 28,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rowDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
    marginTop: 4,
    marginBottom: 28,
  },
  footer: {
    paddingHorizontal: 36,
    paddingBottom: 24,
    paddingTop: 8,
  },
  confirmBtn: {
    height: 63,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xl,
    color: colors.white,
  },
});
