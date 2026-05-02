import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants';

export default function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { user } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        // Firebase 로그인은 됐지만 온보딩(userType 설정) 필요
        navigation.replace('UserType');
      } else {
        // 로그인 화면으로
        navigation.replace('Auth');
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌾</Text>
      <Text style={styles.appName}>시세왕</Text>
      <Text style={styles.slogan}>농산물 가격, 이제 한눈에</Text>
      <Text style={styles.slogan}>— 출하도 스마트하게</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 72, marginBottom: 16 },
  appName: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', marginBottom: 12 },
  slogan: { fontSize: 16, color: '#C8E6C9', textAlign: 'center' },
});
