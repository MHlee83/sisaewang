import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
} from 'react-native';
import { COLORS } from '@/constants';
import { MOCK_PRICES } from '@/services/mockData';
import { useSavingsStore } from '@/store/savingsStore';

function formatPrice(n: number) { return n.toLocaleString('ko-KR') + '원'; }
function calcRate(a: number, b: number) { return b ? ((a - b) / b) * 100 : 0; }

// 1주 후 예상가: 트렌드 지속 가정 (보수적 50%)
function estimateNextWeek(avgPrice: number, prevPrice: number) {
  const weekRate = calcRate(avgPrice, prevPrice);
  const dampened = weekRate * 0.5; // 트렌드 감쇠
  return Math.round(avgPrice * (1 + dampened / 100));
}

export default function ShipmentCalculatorScreen() {
  const { addRecord } = useSavingsStore();
  const [selectedCode, setSelectedCode] = useState<string>(MOCK_PRICES[0]?.itemCode ?? '');
  const [qty, setQty] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const item = MOCK_PRICES.find((p) => p.itemCode === selectedCode);
  const qtyNum = parseFloat(qty) || 0;

  const revenueNow  = useMemo(() => item ? Math.round(item.avgPrice * qtyNum) : 0, [item, qtyNum]);
  const revenueNext = useMemo(() =>
    item ? Math.round(estimateNextWeek(item.avgPrice, item.prevPrice) * qtyNum) : 0,
    [item, qtyNum],
  );
  const diff      = revenueNow - revenueNext;
  const weekRate  = item ? calcRate(item.avgPrice, item.prevPrice) : 0;
  const vsYear    = item ? calcRate(item.avgPrice, item.avgYearPrice) : 0;

  const getRecommendation = () => {
    if (weekRate > 4)  return { text: '📈 가격 상승 중 — 지금 출하가 유리합니다', color: COLORS.dropStrong, bg: '#E3F2FD' };
    if (weekRate < -4) return { text: '📉 가격 하락 중 — 1주 더 기다리세요', color: COLORS.surgeStrong, bg: '#FFEBEE' };
    if (vsYear > 10)   return { text: '✅ 평년보다 높은 가격 — 출하 적기', color: COLORS.dropStrong, bg: '#E8F5E9' };
    if (vsYear < -10)  return { text: '⚠️ 평년 대비 낮음 — 시장 관망 권장', color: '#E65100', bg: '#FFF3E0' };
    return { text: '📊 보합 흐름 — 시장 상황 지켜보세요', color: COLORS.textSecondary, bg: COLORS.background };
  };

  const rec = getRecommendation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 품목 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>출하 품목</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
            <Text style={styles.pickerText}>{item?.itemName ?? '품목 선택'}</Text>
            <Text style={styles.pickerChevron}>{showPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.pickerList}>
              {MOCK_PRICES.slice(0, 20).map((p) => (
                <TouchableOpacity
                  key={p.itemCode}
                  style={[styles.pickerItem, p.itemCode === selectedCode && styles.pickerItemActive]}
                  onPress={() => { setSelectedCode(p.itemCode); setShowPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, p.itemCode === selectedCode && { color: COLORS.primary, fontWeight: '800' }]}>
                    {p.itemName}
                  </Text>
                  <Text style={styles.pickerItemPrice}>{formatPrice(p.avgPrice)}/kg</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 수량 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예상 출하량</Text>
          <View style={styles.qtyRow}>
            <TextInput
              style={styles.qtyInput}
              placeholder="0"
              placeholderTextColor={COLORS.textDisabled}
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
            />
            <Text style={styles.qtyUnit}>kg</Text>
          </View>
        </View>

        {/* 현재 시세 정보 */}
        {item && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.itemName} 시세 현황</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>현재 경락가</Text>
                <Text style={styles.priceBoxValue}>{formatPrice(item.avgPrice)}</Text>
                <Text style={[styles.priceBoxRate, { color: weekRate >= 0 ? COLORS.surgeStrong : COLORS.dropStrong }]}>
                  전주比 {weekRate >= 0 ? '+' : ''}{weekRate.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>평년 평균</Text>
                <Text style={styles.priceBoxValue}>{formatPrice(item.avgYearPrice)}</Text>
                <Text style={[styles.priceBoxRate, { color: vsYear >= 0 ? COLORS.surgeStrong : COLORS.dropStrong }]}>
                  평년比 {vsYear >= 0 ? '+' : ''}{vsYear.toFixed(1)}%
                </Text>
              </View>
            </View>
            {/* 추천 */}
            <View style={[styles.recBanner, { backgroundColor: rec.bg }]}>
              <Text style={[styles.recBannerText, { color: rec.color }]}>{rec.text}</Text>
            </View>
          </View>
        )}

        {/* 수익 비교 */}
        {qtyNum > 0 && item && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>📦 출하 수익 비교</Text>
            <View style={styles.resultRow}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>오늘 출하 시</Text>
                <Text style={[styles.resultAmount, { color: diff >= 0 ? COLORS.dropStrong : COLORS.textPrimary }]}>
                  {formatPrice(revenueNow)}
                </Text>
              </View>
              <Text style={styles.resultVs}>vs</Text>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>1주 후 예상</Text>
                <Text style={[styles.resultAmount, { color: diff < 0 ? COLORS.dropStrong : COLORS.textPrimary }]}>
                  {formatPrice(revenueNext)}
                </Text>
                <Text style={styles.resultEstimate}>* 트렌드 기반 추정</Text>
              </View>
            </View>
            <View style={[styles.diffBanner, { backgroundColor: diff >= 0 ? '#E3F2FD' : '#FFF3E0' }]}>
              <Text style={[styles.diffText, { color: diff >= 0 ? '#1565C0' : '#E65100' }]}>
                {diff >= 0
                  ? `지금 출하 시 ${formatPrice(Math.abs(diff))} 더 유리합니다`
                  : `1주 후 출하 시 ${formatPrice(Math.abs(diff))} 더 유리할 수 있습니다`}
              </Text>
            </View>
            {diff > 0 && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  addRecord(`${item.itemName} 출하 타이밍`, diff);
                  alert('수익 기록이 저장됐습니다.');
                }}
              >
                <Text style={styles.saveBtnText}>💾 수익 기록 저장</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  section:    { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  pickerText:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  pickerChevron: { fontSize: 11, color: COLORS.textDisabled },
  pickerList:    { marginTop: 6, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.divider },
  pickerItem:    {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  pickerItemActive: { backgroundColor: '#F1F8E9' },
  pickerItemText:   { fontSize: 14, color: COLORS.textPrimary },
  pickerItemPrice:  { fontSize: 12, color: COLORS.textSecondary },
  qtyRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 20,
    fontWeight: '800', color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.divider, textAlign: 'right',
  },
  qtyUnit: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  priceRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  priceBox:    { flex: 1, alignItems: 'center' },
  priceDivider:{ width: 1, height: 50, backgroundColor: COLORS.divider, marginHorizontal: 10 },
  priceBoxLabel: { fontSize: 11, color: COLORS.textDisabled, marginBottom: 4 },
  priceBoxValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  priceBoxRate:  { fontSize: 11, fontWeight: '700', marginTop: 3 },
  recBanner:  { borderRadius: 10, padding: 10 },
  recBannerText: { fontSize: 13, fontWeight: '700' },
  resultCard: { backgroundColor: COLORS.surface, margin: 14, borderRadius: 14, padding: 16 },
  resultTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  resultRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  resultBox:  { flex: 1, alignItems: 'center' },
  resultVs:   { fontSize: 13, color: COLORS.textDisabled, marginHorizontal: 8 },
  resultLabel:    { fontSize: 11, color: COLORS.textDisabled, marginBottom: 6 },
  resultAmount:   { fontSize: 20, fontWeight: '800' },
  resultEstimate: { fontSize: 10, color: COLORS.textDisabled, marginTop: 4 },
  diffBanner: { borderRadius: 10, padding: 12, marginBottom: 12 },
  diffText:   { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  saveBtn:    { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText:{ color: '#fff', fontSize: 14, fontWeight: '800' },
});
