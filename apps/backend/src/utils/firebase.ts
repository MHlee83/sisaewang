import admin from 'firebase-admin';
import { logger } from './logger';

export function initFirebase() {
  if (admin.apps.length > 0) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  logger.info('Firebase Admin SDK 초기화 완료');
}

// ===== JWT 토큰 검증 =====
export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
  return admin.auth().verifyIdToken(token);
}

// ===== FCM 푸시 발송 =====
export async function sendPushNotification(params: {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await admin.messaging().send({
      token: params.fcmToken,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'price_alerts',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
  } catch (err) {
    logger.error('FCM 발송 실패:', { fcmToken: params.fcmToken.slice(0, 20), err });
  }
}
