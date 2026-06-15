import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseHHMM } from '../utils/todoTime';

// 앱이 켜져 있을 때도 배너로 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 알림 권한 요청 + Android 채널 준비. 허용 여부 반환. */
export async function ensureNotificationSetup(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: '케어 리마인더',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return granted;
}

export interface PresetReminder {
  label: string; // 예: '밥 주기'
  time: string; // 목표 시간 "HH:MM"
}

/** 프리셋 리마인더를 "목표 30분 전" 매일 알림으로 전부 재설정한다. */
export async function syncPresetReminders(reminders: PresetReminder[]): Promise<void> {
  // 기존 예약을 모두 지우고 다시 등록 (상태 정합을 단순하게 유지)
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const r of reminders) {
    const mins = parseHHMM(r.time);
    if (mins === null) continue;
    let remindAt = mins - 30; // 30분 전
    if (remindAt < 0) remindAt += 24 * 60; // 자정 넘김 보정
    const hour = Math.floor(remindAt / 60);
    const minute = remindAt % 60;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '집사야, 곧 시간이야! 🐾',
          body: `${r.time}에 "${r.label}" 예정이에요. (30분 전 알림)`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
        },
      });
    } catch (e) {
      console.error('[notifications] 예약 실패:', r.label, e);
    }
  }
}
