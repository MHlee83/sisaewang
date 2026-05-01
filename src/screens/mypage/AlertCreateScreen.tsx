import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAlert } from '@/services/alertService';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { getDefaultAlertType } from '@/utils/userTypeUtils';
import { COLORS } from '@/constants';
import type { AlertType } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertCreate'>;

const ALERT_TYPES: Array<{ type: AlertType; label: string; unit: string; desc: string }> = [
  { type: 'PRICE_ABOVE', label: '가격 이상',  unit: '원',  desc: '설정 가격 이상 도달 시 알림' },
  { type: 'PRICE_BELOW', label: '가격 이하',  unit: '원',  desc: '설정 가격 이하 도달 시 알림' },
  { type: 'CHANGE_RATE', label: '등락률',     unit: '%',   desc: '전일 대비 ±N% 이상 변동 시' },
  { type: 'VS_AVERAGE',  label: '평년 대비',  unit: '%',   desc: '평년 대비 ±N% 초과 시 알림' },
];

export default function AlertCreateScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation();
  const { itemCode, itemName } = route.params;
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<AlertType>(
    getDefaultAlertType(user?.userType) as AlertType
  );
  const [threshold, setThreshold] = useState('');

  const queryClient = useQueryClient();
  const { addAlert } = useAlertStore();

  const mutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      Alert.alert('알림 추가 완료', `${itemName} 알림이 설정되었습니다.`);
      navigation.goBack();
    },
    onError: () => {
      // API 미연결 시 로컬 store에 저장 (개발 모드 폴백)
      addAlert({
        id: Date.now().toString(),
        itemCode,
        itemName,
        alertType: selectedType,
        thresholdValue: parseFloat(threshold),
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('알림 추가 완료', `${itemName} 알림이 설정되었습니다.`);
      navigation.goBack();
    },
  });

  const selectedTypeConfig = ALERT_TYPES.find((t) => t.type === selectedType)!;

  const handleSave = () => {
    if (!threshold) {
      Alert.alert('입력 오류', '기준값을 입력해주세요.');
      return;
    }
    mutation.mutate({
      itemId: parseInt(itemCode), // TODO: itemId 매핑 필요
      marketId: null,
      alertType: selectedType,
      thresholdValue: parseFloat(threshold),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.itemName}>{itemName}</Text>

        <Text style={styles.label}>알림 유형</Text>
        <View style={styles.typeGrid}>
          {ALERT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              style={[styles.typeBtn, selectedType === t.type && styles.typeBtnSelected]}
              onPress={() => setSelectedType(t.type)}
            >
              <Text style={[styles.typeBtnText, selectedType === t.type && styles.typeBtnTextSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.typeDesc}>{selectedTypeConfig.desc}</Text>

        <Text style={styles.label}>기준값 ({selectedTypeConfig.unit})</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={threshold}
            onChangeText={setThreshold}
            placeholder={selectedTypeConfig.unit === '원' ? '예: 15000' : '예: 10'}
            placeholderTextColor={COLORS.textDisabled}
          />
          <Text style={styles.unit}>{selectedTypeConfig.unit}</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, mutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {mutation.isPending ? '저장 중...' : '알림 저장'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 24 },
  itemName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  typeBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  typeBtnTextSelected: { color: '#fff' },
  typeDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 32,
  },
  input: { flex: 1, fontSize: 18, paddingVertical: 14, color: COLORS.textPrimary },
  unit: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: COLORS.textDisabled },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
