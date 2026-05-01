import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '@/constants';
import { useAuthStore } from '@/store/authStore';

export default function NotificationPermissionScreen() {
  const { completeOnboarding } = useAuthStore();

  const handleAllow = async () => {
    // TODO: expo-notifications로 권한 요청
    completeOnboarding(); // RootNavigator가 자동으로 Main으로 전환
  };

  const goToMain = () => {
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>알림을 허용하시겠어요?</Text>
        <Text style={styles.desc}>
          관심 품목의 가격이{'\n'}급등락하면 즉시 알려드려요.{'\n\n'}
          나중에 설정에서도 변경할 수 있어요.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleAllow}>
          <Text style={styles.buttonText}>알림 허용</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={goToMain}>
          <Text style={styles.skipText}>나중에 설정</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipButton: { paddingVertical: 12 },
  skipText: { fontSize: 14, color: COLORS.textSecondary },
});
