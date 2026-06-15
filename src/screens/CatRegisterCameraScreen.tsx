import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, fontFamily } from '../theme';
import { useApp } from '../store';

type PickSource = 'camera' | 'library';

interface CatRegisterCameraScreenProps {
  target?: 'cat' | 'memory';
  onCaptured?: (uri: string) => void;
  onClose?: () => void;
}

/**
 * CatRegisterCameraScreen — 사진 등록(촬영 / 앨범 선택)
 * 하단 시트에서 "사진 촬영" 또는 "앨범에서 선택" 중 하나를 고르면
 * 휴대폰 기본 카메라/사진 보관함을 호출한다. 선택 후 저장하고 닫힌다.
 */
export function CatRegisterCameraScreen({
  target = 'cat',
  onCaptured,
  onClose,
}: CatRegisterCameraScreenProps) {
  const { setCatPhoto, addMemory } = useApp();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<PickSource | null>(null);

  const persistPhoto = useCallback(
    async (uri: string) => {
      if (target === 'memory') {
        const d = new Date();
        const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        await addMemory({ photoUri: uri, date, caption: '' });
      } else {
        await setCatPhoto(uri);
      }
      onCaptured?.(uri);
    },
    [target, addMemory, setCatPhoto, onCaptured],
  );

  const pick = useCallback(
    async (source: PickSource) => {
      if (busy) return;
      setBusy(true);
      setDenied(null);
      try {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setDenied(source);
          setBusy(false);
          return;
        }

        // 기록(memory)은 원본 전체, 고양이 프로필은 정사각 크롭 유지
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          quality: 0.85,
          allowsEditing: target !== 'memory',
          ...(target === 'memory' ? {} : { aspect: [1, 1] as [number, number] }),
        };

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets[0]?.uri) {
          await persistPhoto(result.assets[0].uri);
        } else {
          // 사용자가 취소 → 시트는 유지(다른 방법을 고를 수 있도록)
          setBusy(false);
        }
      } catch (err) {
        setBusy(false);
        Alert.alert('실패', err instanceof Error ? err.message : '다시 시도해주세요.');
      }
    },
    [busy, target, persistPhoto],
  );

  const title = target === 'memory' ? '추억 사진 추가' : '고양이 사진 등록';

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {denied ? (
          <>
            <Text style={styles.deniedText}>
              {denied === 'camera'
                ? '카메라 권한이 필요해요.\n설정에서 OnHand의 카메라 권한을 허용해주세요.'
                : '사진 접근 권한이 필요해요.\n설정에서 OnHand의 사진 권한을 허용해주세요.'}
            </Text>
            <Pressable style={styles.optionBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.optionText}>설정 열기</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => setDenied(null)}>
              <Text style={styles.optionText}>다시 선택하기</Text>
            </Pressable>
          </>
        ) : busy ? (
          <View style={styles.busyBox}>
            <ActivityIndicator color={colors.primaryDark} />
          </View>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.optionBtn, pressed && styles.optionPressed]}
              onPress={() => pick('camera')}
            >
              <Image
                source={require('../assets/camera.png')}
                style={styles.cameraIcon}
                resizeMode="contain"
              />
              <Text style={styles.optionText}>사진 촬영</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.optionBtn, pressed && styles.optionPressed]}
              onPress={() => pick('library')}
            >
              <Image
                source={require('../assets/album.png')}
                style={styles.albumIcon}
                resizeMode="contain"
              />
              <Text style={styles.optionText}>앨범에서 선택</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate200,
    marginBottom: 12,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  optionBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  optionPressed: { opacity: 0.7 },
  cameraIcon: { width: 20, height: 20 },
  albumIcon: { width: 20, height: 20 },
  optionText: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.textPrimary },
  busyBox: { height: 118, alignItems: 'center', justifyContent: 'center' },
  deniedText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  cancelBtn: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelText: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.textSecondary },
});
