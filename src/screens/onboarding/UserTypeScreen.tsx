import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants';
import type { UserType } from '@/types';

const USER_TYPES: Array<{
  type: UserType;
  emoji: string;
  title: string;
  description: string;
}> = [
  {
    type: 'CONSUMER',
    emoji: '🛒',
    title: '소비자',
    description: '실시간 소매가 비교로\n스마트 장보기',
  },
  {
    type: 'FARMER',
    emoji: '🌾',
    title: '소농·출하자',
    description: '경락가 조회 + AI 출하\n타이밍 추천으로 수익 극대화',
  },
  {
    type: 'BUYER',
    emoji: '🏪',
    title: '유통 바이어·식당',
    description: '전 품목 대시보드 +\n주간 시세 리포트',
  },
];

export default function UserTypeScreen() {
  const [selected, setSelected] = useState<UserType | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { updateUserType } = useAuthStore();

  const handleNext = () => {
    if (!selected) return;
    updateUserType(selected);
    navigation.navigate('FavoriteItems');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>어떻게 사용하실 건가요?</Text>
        <Text style={styles.subtitle}>나에게 맞는 정보를 먼저 보여드려요</Text>

        <View style={styles.cards}>
          {USER_TYPES.map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[styles.card, selected === item.type && styles.cardSelected]}
              onPress={() => setSelected(item.type)}
              activeOpacity={0.8}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={[styles.cardTitle, selected === item.type && styles.cardTitleSelected]}>
                {item.title}
              </Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 36 },
  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.divider,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  emoji: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardTitleSelected: { color: COLORS.primary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  button: {
    marginTop: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: COLORS.textDisabled },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
