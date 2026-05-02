/**
 * FCM 푸시 알림 서비스
 * expo-notifications + Firebase FCM
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { updateUserType } from './apiService';

// 포그라운드 알림 표시 방식
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * 알림 권한 요청 + FCM 토큰 반환
 * 실기기에서만 동작 (시뮬레이터 불가)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Constants.isDevice) {
    console.warn('[FCM] 실기기에서만 푸시 알림이 동작합니다.');
    return null;
  }

  // 기존 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한이 없으면 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[FCM] 알림 권한 거부됨');
    return null;
  }

  // Android 알림 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: '가격 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A6B38',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('market-news', {
      name: '시장 뉴스',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '9bb9b5aa-7052-4b61-82f9-14527c0125b0', // app.json extra.eas.projectId
    });
    return tokenData.data;
  } catch (err) {
    console.error('[FCM] 토큰 취득 실패:', err);
    return null;
  }
}

/**
 * FCM 토큰을 백엔드에 저장
 */
export async function saveFcmToken(token: string): Promise<void> {
  try {
    // apiService의 api 인스턴스를 직접 사용
    const { default: api } = await import('./api');
    await api.patch('/users/me/fcm-token', { fcmToken: token });
  } catch (err) {
    console.warn('[FCM] 토큰 저장 실패 (무시됨):', err);
  }
}

/**
 * 알림 수신 리스너 등록
 * App.tsx에서 호출, unmount 시 구독 해제 필요
 */
export function addNotificationListeners(
  onReceive?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void,
) {
  const receiveSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('[FCM] 포그라운드 알림:', notification.request.content.title);
      onReceive?.(notification);
    },
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      console.log('[FCM] 알림 탭:', data);
      onResponse?.(response);
    },
  );

  return () => {
    receiveSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * 로컬 테스트용: 즉시 알림 발송
 */
export async function sendLocalNotification(title: string, body: string, data?: object) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: 'default' },
    trigger: null, // 즉시 발송
  });
}
