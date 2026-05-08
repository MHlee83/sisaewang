import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from '@/navigation/RootNavigator';
import IntroScreen from '@/screens/onboarding/IntroScreen';
import { useAuthStore } from '@/store/authStore';

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
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // Firebase 없이 바로 시작 (테스트 모드)
    setUser(null);
    setLoading(false);

    AsyncStorage.getItem('hasSeenIntro')
      .catch(() => '1')
      .then((seen) => {
        setShowIntro(seen !== '1');
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

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
