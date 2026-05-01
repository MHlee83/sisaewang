import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { COLORS } from '@/constants';

export default function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('UserType');
    }, 2000);
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
