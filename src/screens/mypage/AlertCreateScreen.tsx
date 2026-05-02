import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView,
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
import { MOCK_PRICES } from '@/services/mockData';
import type { AlertType } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertCreate'>;

const ALERT_TYPES: Array<{ type: AlertType; label: string; unit: string; desc: string }> = [
  { type: 'PRICE_ABOVE', label: '가격 이상',  unit: '원',  desc: '설정 가격 이상 도달 시 알림' },
  { type: 'PRICE_BELOW', label: '가격 이하',  unit: '원',  desc: '설정 가격 이하 도달 시 알림' },
  { type: 'CHANGE_RATE', label: '등락률',     unit: '%',   desc: '전일 대비 ±N% 이상 변동 시' },
  { type: 'VS_AVERAGE',  label: '평년 대비',  unit: '%',   desc: '평년 대비 ±N% 초과 시 알림' },
];

// ── AI 신호 계산 ─────────────────────────────────────────────
type Signal = 'BUY' | 'HOLD' | 'SELL';

interface SignalResult {
  signal: Signal;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  reason: string;
  vsAvg: number;       // 평년 대비 %
  vsYest: number;      // 전일 대비 %
  currentPrice: number;
  avgYearPrice: number;
  trend: '상승' | '하락' | '보합';
  trendEmoji: string;
}

function calcSignal(itemCode: string): SignalResult | null {
  const item = MOCK_PRICES.find((p) => p.itemCode === itemCode);
  if (!item) return null;

  const vsAvg  = ((item.avgPrice - item.avgYearPrice) / item.avgYearPrice) * 100;
  const vsYest = ((item.avgPrice - item.prevPrice) / item.prevPrice) * 100;

  const trend: '상승' | '하락' | '보합' =
    vsYest > 1 ? '상승' : vsYest < -1 ? '하락' : '보합';
  const trendEmoji = trend === '상승' ? '📈' : trend === '하락' ? '📉' : '➡️';

  let signal: Signal;
  let reason: string;

  if (vsAvg <= -12) {
    signal = 'BUY';
    reason = `평년 대비 ${Math.abs(vsAvg).toFixed(1)}% 낮음 — 매입 적기`;
  } else if (vsAvg >= 12) {
    signal = 'SELL';
    reason = `평년 대비 ${vsAvg.toFixed(1)}% 높음 — 출하/처분 고려`;
  } else if (vsAvg <= -5 && trend === '하락') {
    signal = 'BUY';
    reason = `하락 추세 + 평년 이하 — 저점 매입 기회`;
  } else if (vsAvg >= 5 && trend === '상승') {
    signal = 'SELL';
    reason = `상승 추세 + 평년 이상 — 출하 타이밍`;
  } else {
    signal = 'HOLD';
    reason = `평년 대비 ${vsAvg > 0 ? '+' : ''}${vsAvg.toFixed(1)}% — 시장 모니터링 권장`;
  }

  const signalConfig = {
    BUY:  { label: '매수 적기',   emoji: '🟢', color: '#1B8A4E', bgColor: '#E8F5E9' },
    HOLD: { label: '관망',        emoji: '🟡', color: '#B07D0A', bgColor: '#FFF8E1' },
    SELL: { label: '출하 타이밍', emoji: '🔴', color: '#C62828', bgColor: '#FFEBEE' },
  }[signal];

  return { signal, ...signalConfig, reason, vsAvg, vsYest, currentPrice: item.avgPrice, avgYearPrice: item.avgYearPrice, trend, trendEmoji };
}

function formatPrice(n: number) { return n.toLocaleString('ko-KR') + '원'; }

// ── AI 신호 카드 컴포넌트 ─────────────────────────────────────
function AISignalCard({ itemCode, itemName }: { itemCode: string; itemName: string }) {
  const sig = useMemo(() => calcSignal(itemCode), [itemCode]);
  if (!sig) return null;

  return (
    <View style={[sigStyles.card, { backgroundColor: sig.bgColor }]}>
      <View style={sigStyles.header}>
        <Text style={sigStyles.title}>🤖 AI 시세 분석</Text>
        <View style={[sigStyles.badge, { backgroundColor: sig.color }]}>
          <Text style={sigStyles.badgeText}>{sig.emoji} {sig.label}</Text>
        </View>
      </View>

      <Text style={[sigStyles.reason, { color: sig.color }]}>{sig.reason}</Text>

      <View style={sigStyles.statsRow}>
        <View style={sigStyles.statBox}>
          <Text style={sigStyles.statLabel}>현재가</Text>
          <Text style={[sigStyles.statValue, { color: COLORS.textPrimary }]}>
            {formatPrice(sig.currentPrice)}
          </Text>
        </View>
        <View style={sigStyles.statBox}>
          <Text style={sigStyles.statLabel}>평년가</Text>
          <Text style={[sigStyles.statValue, { color: COLORS.textSecondary }]}>
            {formatPrice(sig.avgYearPrice)}
          </Text>
        </View>
        <View style={sigStyles.statBox}>
          <Text style={sigStyles.statLabel}>평년 대비</Text>
          <Text style={[sigStyles.statValue, { color: sig.vsAvg > 0 ? '#C62828' : '#1B8A4E' }]}>
            {sig.vsAvg > 0 ? '+' : ''}{sig.vsAvg.toFixed(1)}%
          </Text>
        </View>
        <View style={sigStyles.statBox}>
          <Text style={sigStyles.statLabel}>추세</Text>
          <Text style={sigStyles.statValue}>{sig.trendEmoji} {sig.trend}</Text>
        </View>
      </View>

      {/* 게이지 바 */}
      <View style={sigStyles.gaugeWrap}>
        <Text style={sigStyles.gaugeLabel}>평년 대비 위치</Text>
        <View style={sigStyles.gaugeTrack}>
          <View style={sigStyles.gaugeZones}>
            <View style={[sigStyles.gaugeZone, { flex: 1, backgroundColor: '#C8E6C9' }]} />
            <View style={[sigStyles.gaugeZone, { flex: 1, backgroundColor: '#FFF9C4' }]} />
            <View style={[sigStyles.gaugeZone, { flex: 1, backgroundColor: '#FFCDD2' }]} />
          </View>
          {/* 포인터 */}
          <View style={[sigStyles.gaugePointer, {
            left: `${Math.min(Math.max(((sig.vsAvg + 30) / 60) * 100, 2), 98)}%`,
            backgroundColor: sig.color,
          } as any]} />
        </View>
        <View style={sigStyles.gaugeAxisRow}>
          <Text style={sigStyles.gaugeAxis}>-30%</Text>
          <Text style={sigStyles.gaugeAxis}>평년</Text>
          <Text style={sigStyles.gaugeAxis}>+30%</Text>
        </View>
      </View>

      <Text style={sigStyles.disclaimer}>* AI 분석은 참고용입니다. 실제 매매는 시장 상황을 직접 확인하세요.</Text>
    </View>
  );
}

const sigStyles = StyleSheet.create({
  card:       { borderRadius: 16, padding: 16, marginBottom: 16 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:      { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  badge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  reason:     { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  statsRow:   { flexDirection: 'row', gap: 6, marginBottom: 14 },
  statBox:    { flex: 1, alignItems: 'center' },
  statLabel:  { fontSize: 10, color: COLORS.textDisabled, marginBottom: 3 },
  statValue:  { fontSize: 12, fontWeight: '800' },
  gaugeWrap:  { marginBottom: 8 },
  gaugeLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  gaugeTrack: { height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  gaugeZones: { flexDirection: 'row', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gaugeZone:  { height: '100%' },
  gaugePointer: {
    position: 'absolute', top: -2, width: 16, height: 16,
    borderRadius: 8, borderWidth: 2, borderColor: '#fff',
    transform: [{ translateX: -8 }],
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  gaugeAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  gaugeAxis:  { fontSize: 10, color: COLORS.textDisabled },
  disclaimer: { fontSize: 10, color: COLORS.textDisabled, marginTop: 6 },
});

// ── 메인 화면 ─────────────────────────────────────────────────
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
      itemId: parseInt(itemCode),
      marketId: null,
      alertType: selectedType,
      thresholdValue: parseFloat(threshold),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.itemName}>{itemName}</Text>

        {/* ── AI 신호 카드 */}
        <AISignalCard itemCode={itemCode} itemName={itemName} />

        {/* ── 알림 유형 */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 24 },
  itemName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider,
  },
  typeBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  typeBtnTextSelected: { color: '#fff' },
  typeDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.divider,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 32,
  },
  input: { flex: 1, fontSize: 18, paddingVertical: 14, color: COLORS.textPrimary },
  unit: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: COLORS.textDisabled },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
