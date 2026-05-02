import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import RootNavigator from '@/navigation/RootNavigator';
import IntroScreen from '@/screens/onboarding/IntroScreen';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { setUser, setLoading } = useAuthStore();
  const [showIntro, setShowIntro] = useState<boolean | null>(null); // null = 아직 확인 중

  useEffect(() => {
    let splashHidden = false;

    // Firebase 인증 상태 구독
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user를 앱 User 타입으로 매핑
        const appUser: User = {
          id: 0, // 백엔드 연동 후 실제 ID로 교체
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          nickname: firebaseUser.displayName || '사용자',
          userType: 'CONSUMER', // 온보딩에서 실제로 설정됨
          fcmToken: null,
          isPremium: false,
          plan: 'FREE',
          createdAt: new Date().toISOString(),
        };
        setUser(appUser);
      } else {
        setUser(null);
      }

      // 인트로 화면 여부 확인
      if (showIntro === null) {
        const seen = await AsyncStorage.getItem('hasSeenIntro').catch(() => '1');
        setShowIntro(seen !== '1');
      }

      // 스플래시 한 번만 숨기기
      if (!splashHidden) {
        splashHidden = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase 상태 확인 전에는 아무것도 렌더하지 않음
  if (showIntro === null) return null;

  if (showIntro) {
    return (
      <IntroScreen
        onDone={() => {
          AsyncStorage.setItem('hasSeenIntro', '1').catch(() => {});
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
