/**
 * 도매 손익 계산기 v2
 * - 2단계 카테고리 → 품목 선택 (전체 120+ 품목)
 * - 천단위 쉼표 포맷 TextInput
 * - useProfitStore 로 화면 이탈 후 상태 복원
 */
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
} from 'react-native';
import { COLORS, CATEGORIES } from '@/constants';
import { MOCK_PRICES } from '@/services/mockData';
import { useProfitStore } from '@/store/calculatorStore';

function fmt(n: number, unit = '원') {
  return n.toLocaleString('ko-KR') + unit;
}
function fmtPct(n: number) {
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}

// 천단위 쉼표 표시 / 입력 처리
function toDisplay(raw: string) {
  if (!raw) return '';
  const n = parseInt(raw, 10);
  return isNaN(n) ? '' : n.toLocaleString('ko-KR');
}
function toRaw(text: string) {
  return text.replace(/[^0-9]/g, '');
}

// ── 카테고리 목록 (전체 포함) ─────────────────────────────────
const CAT_ALL = [{ code: '', name: '전체', emoji: '📋' }, ...CATEGORIES];

// ── 박스 규격 프리셋 ─────────────────────────────────────────
const BOX_SIZES = [
  { label: '10kg', kg: 10 },
  { label: '15kg', kg: 15 },
  { label: '20kg', kg: 20 },
  { label: '직접',  kg: 0 },
];

// ── 시장 수수료율 ────────────────────────────────────────────
const MARKET_FEE_RATES = [
  { label: '가락 (7%)', rate: 7 },
  { label: '강서 (6%)', rate: 6 },
  { label: '구리 (7%)', rate: 7 },
  { label: '직접입력',  rate: -1 },
];

interface ResultData {
  totalBuyCost: number; totalWeight: number; grossRevenue: number;
  feeAmount: number; netRevenue: number; totalCost: number;
  netProfit: number; roi: number; breakEvenPerKg: number;
  profitPerKg: number; isProfit: boolean;
}

export default function ProfitCalculatorScreen() {
  const {
    selectedItemCode, buyPriceStr, boxCountStr, boxKgIdx, customBoxKgStr,
    transportStr, handlingStr, otherCostStr, feeRateIdx, customFeeStr,
    sellPriceStr, setProfitField, resetProfit,
  } = useProfitStore();

  const [selectedCat, setSelectedCat] = React.useState('');
  const [showItemPicker, setShowItemPicker] = React.useState(false);

  const selectedItem = MOCK_PRICES.find((p) => p.itemCode === selectedItemCode) ?? MOCK_PRICES[0];

  // 2단계: 카테고리 필터
  const displayItems = useMemo(() =>
    selectedCat ? MOCK_PRICES.filter((p) => p.category === selectedCat) : MOCK_PRICES,
  [selectedCat]);

  // 손익 계산
  const result = useMemo<ResultData | null>(() => {
    const buyPrice  = parseInt(buyPriceStr,  10) || 0;
    const boxCount  = parseInt(boxCountStr,  10) || 0;
    const boxKg     = boxKgIdx < 3 ? BOX_SIZES[boxKgIdx].kg : (parseInt(customBoxKgStr, 10) || 0);
    const transport = parseInt(transportStr, 10) || 0;
    const handling  = parseInt(handlingStr,  10) || 0;
    const otherCost = parseInt(otherCostStr, 10) || 0;
    const feeRate   = feeRateIdx < 3 ? MARKET_FEE_RATES[feeRateIdx].rate : (parseFloat(customFeeStr) || 0);
    const sellPrice = parseInt(sellPriceStr, 10) || selectedItem.avgPrice;

    if (buyPrice === 0 || boxCount === 0 || boxKg === 0) return null;

    const totalWeight    = boxCount * boxKg;
    const totalBuyCost   = buyPrice * totalWeight;
    const grossRevenue   = sellPrice * totalWeight;
    const feeAmount      = grossRevenue * (feeRate / 100);
    const netRevenue     = grossRevenue - feeAmount;
    const totalCost      = totalBuyCost + transport + handling + otherCost;
    const netProfit      = netRevenue - totalCost;
    const roi            = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    const breakEvenPerKg = totalWeight > 0 ? (totalCost / (1 - feeRate / 100)) / totalWeight : 0;
    const profitPerKg    = totalWeight > 0 ? netProfit / totalWeight : 0;

    return {
      totalBuyCost, totalWeight, grossRevenue, feeAmount,
      netRevenue, totalCost, netProfit, roi, breakEvenPerKg, profitPerKg,
      isProfit: netProfit >= 0,
    };
  }, [buyPriceStr, boxCountStr, boxKgIdx, customBoxKgStr, transportStr,
      handlingStr, otherCostStr, feeRateIdx, customFeeStr, sellPriceStr, selectedItem]);

  const sellPrice = parseInt(sellPriceStr, 10) || selectedItem.avgPrice;
  const feeRate   = feeRateIdx < 3 ? MARKET_FEE_RATES[feeRateIdx].rate : (parseFloat(customFeeStr) || 0);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* ── 1단계: 카테고리 선택 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>① 카테고리 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.catRow}>
              {CAT_ALL.map((cat) => (
                <TouchableOpacity
                  key={cat.code}
                  style={[s.catChip, selectedCat === cat.code && s.catChipActive]}
                  onPress={() => { setSelectedCat(cat.code); setShowItemPicker(true); }}
                >
                  <Text style={[s.catChipText, selectedCat === cat.code && s.catChipTextActive]}>
                    {cat.emoji} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── 2단계: 품목 선택 ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>② 품목 선택</Text>
            <TouchableOpacity onPress={() => setShowItemPicker((v) => !v)}>
              <Text style={s.toggleBtn}>{showItemPicker ? '접기 ▲' : '펼치기 ▼'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.itemSelector} onPress={() => setShowItemPicker((v) => !v)}>
            <Text style={s.itemSelectorText}>{selectedItem.itemName}</Text>
            <Text style={s.itemSelectorArrow}>{showItemPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showItemPicker && (
            <View style={s.itemGrid}>
              {displayItems.map((p) => (
                <TouchableOpacity
                  key={p.itemCode}
                  style={[s.itemChip, selectedItemCode === p.itemCode && s.itemChipActive]}
                  onPress={() => {
                    setProfitField('selectedItemCode', p.itemCode);
                    setProfitField('sellPriceStr', '');
                    setShowItemPicker(false);
                  }}
                >
                  <Text style={[s.itemChipText, selectedItemCode === p.itemCode && s.itemChipTextActive]}>
                    {selectedItemCode === p.itemCode ? '✓ ' : ''}{p.itemName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.marketPriceRow}>
            <Text style={s.marketPriceLabel}>현재 도매 평균가</Text>
            <Text style={s.marketPriceValue}>{fmt(selectedItem.avgPrice)}/kg</Text>
          </View>
        </View>

        {/* ── 매입 정보 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>매입 정보</Text>

          <Text style={s.fieldLabel}>매입가 (원/kg)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={toDisplay(buyPriceStr)}
            onChangeText={(t) => setProfitField('buyPriceStr', toRaw(t))}
            placeholder="예: 1,200"
            placeholderTextColor={COLORS.textDisabled}
          />

          <Text style={s.fieldLabel}>박스당 중량</Text>
          <View style={s.chipRow}>
            {BOX_SIZES.map((b, i) => (
              <TouchableOpacity
                key={b.label}
                style={[s.chip, boxKgIdx === i && s.chipActive]}
                onPress={() => setProfitField('boxKgIdx', i)}
              >
                <Text style={[s.chipText, boxKgIdx === i && s.chipTextActive]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {boxKgIdx === 3 && (
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              keyboardType="numeric"
              value={toDisplay(customBoxKgStr)}
              onChangeText={(t) => setProfitField('customBoxKgStr', toRaw(t))}
              placeholder="박스당 kg 직접 입력"
              placeholderTextColor={COLORS.textDisabled}
            />
          )}

          <Text style={s.fieldLabel}>매입 박스 수</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={toDisplay(boxCountStr)}
            onChangeText={(t) => setProfitField('boxCountStr', toRaw(t))}
            placeholder="예: 50"
            placeholderTextColor={COLORS.textDisabled}
          />

          {buyPriceStr && boxCountStr ? (() => {
            const bw = (parseInt(boxCountStr, 10) || 0) *
              (boxKgIdx < 3 ? BOX_SIZES[boxKgIdx].kg : (parseInt(customBoxKgStr, 10) || 0));
            const bt = (parseInt(buyPriceStr, 10) || 0) * bw;
            return (
              <View style={s.subResultRow}>
                <Text style={s.subResultLabel}>총 중량</Text>
                <Text style={s.subResultValue}>{fmt(bw, 'kg')}</Text>
                <Text style={s.subResultLabel}>  총 매입금액</Text>
                <Text style={s.subResultValue}>{fmt(bt)}</Text>
              </View>
            );
          })() : null}
        </View>

        {/* ── 비용 정보 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>비용 정보</Text>

          <Text style={s.fieldLabel}>도매시장 수수료율</Text>
          <View style={s.chipRow}>
            {MARKET_FEE_RATES.map((f, i) => (
              <TouchableOpacity
                key={f.label}
                style={[s.chip, feeRateIdx === i && s.chipActive]}
                onPress={() => setProfitField('feeRateIdx', i)}
              >
                <Text style={[s.chipText, feeRateIdx === i && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {feeRateIdx === 3 && (
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              keyboardType="numeric"
              value={customFeeStr}
              onChangeText={(t) => setProfitField('customFeeStr', toRaw(t))}
              placeholder="수수료율 % 직접 입력"
              placeholderTextColor={COLORS.textDisabled}
            />
          )}

          <Text style={s.fieldLabel}>운반비 (원)</Text>
          <TextInput
            style={s.input} keyboardType="numeric"
            value={toDisplay(transportStr)}
            onChangeText={(t) => setProfitField('transportStr', toRaw(t))}
            placeholder="예: 50,000"
            placeholderTextColor={COLORS.textDisabled}
          />

          <Text style={s.fieldLabel}>상하차비 (원)</Text>
          <TextInput
            style={s.input} keyboardType="numeric"
            value={toDisplay(handlingStr)}
            onChangeText={(t) => setProfitField('handlingStr', toRaw(t))}
            placeholder="예: 30,000"
            placeholderTextColor={COLORS.textDisabled}
          />

          <Text style={s.fieldLabel}>기타 비용 (원)</Text>
          <TextInput
            style={s.input} keyboardType="numeric"
            value={toDisplay(otherCostStr)}
            onChangeText={(t) => setProfitField('otherCostStr', toRaw(t))}
            placeholder="예: 20,000"
            placeholderTextColor={COLORS.textDisabled}
          />
        </View>

        {/* ── 판매 정보 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>판매 가격</Text>
          <Text style={s.fieldLabel}>예상 판매가 (원/kg, 비우면 현재 시세 사용)</Text>
          <TextInput
            style={s.input} keyboardType="numeric"
            value={toDisplay(sellPriceStr)}
            onChangeText={(t) => setProfitField('sellPriceStr', toRaw(t))}
            placeholder={`현재 시세: ${fmt(selectedItem.avgPrice)}/kg`}
            placeholderTextColor={COLORS.primary}
          />
        </View>

        {/* ── 결과 ── */}
        {result ? (
          <View style={[s.resultCard, { borderColor: result.isProfit ? '#0D6B3A' : '#B71C1C' }]}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>손익 분석 결과</Text>
              <View style={[s.resultBadge, { backgroundColor: result.isProfit ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[s.resultBadgeText, { color: result.isProfit ? '#0D6B3A' : '#B71C1C' }]}>
                  {result.isProfit ? '✅ 수익' : '❌ 손실'}
                </Text>
              </View>
            </View>

            {/* 핵심 지표 */}
            <View style={s.kpiRow}>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>순이익</Text>
                <Text style={[s.kpiValue, { color: result.isProfit ? '#0D6B3A' : '#B71C1C' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmt(Math.round(result.netProfit))}
                </Text>
              </View>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>투자수익률</Text>
                <Text style={[s.kpiValue, { color: result.isProfit ? '#0D6B3A' : '#B71C1C' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtPct(result.roi)}
                </Text>
              </View>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>kg당 마진</Text>
                <Text style={[s.kpiValue, { color: result.isProfit ? '#0D6B3A' : '#B71C1C' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmt(Math.round(result.profitPerKg))}
                </Text>
              </View>
            </View>

            {/* 상세 내역 */}
            <View style={s.detailTable}>
              {[
                { label: '총 매입금액',         value: fmt(Math.round(result.totalBuyCost)),                   bold: false },
                { label: '운반비 외',             value: fmt(Math.round(result.totalCost - result.totalBuyCost)), bold: false },
                { label: '총 비용',              value: fmt(Math.round(result.totalCost)),                      bold: true  },
                { label: '판매 총액',             value: fmt(Math.round(result.grossRevenue)),                   bold: false },
                { label: `수수료 (${feeRate}%)`, value: `-${fmt(Math.round(result.feeAmount))}`,                bold: false },
                { label: '실수령액',             value: fmt(Math.round(result.netRevenue)),                     bold: true  },
              ].map((row) => (
                <View key={row.label} style={s.detailRow}>
                  <Text style={[s.detailLabel, row.bold && { fontWeight: '700', color: COLORS.textPrimary }]}>
                    {row.label}
                  </Text>
                  <Text style={[s.detailValue, row.bold && { fontWeight: '700', color: COLORS.textPrimary }]}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* 손익분기 */}
            <View style={s.breakEvenBox}>
              <Text style={s.breakEvenLabel}>손익분기 판매가</Text>
              <Text style={s.breakEvenValue}>{fmt(Math.round(result.breakEvenPerKg))}/kg</Text>
              <Text style={s.breakEvenSub}>
                현재 시세 {fmt(sellPrice)}/kg 대비{' '}
                <Text style={{ color: result.isProfit ? '#0D6B3A' : '#B71C1C', fontWeight: '700' }}>
                  {fmtPct(((sellPrice - result.breakEvenPerKg) / result.breakEvenPerKg) * 100)}
                </Text>
              </Text>
            </View>

            {/* 조언 */}
            <View style={[s.adviceBox, { backgroundColor: result.isProfit ? '#E8F5E9' : '#FFF3E0' }]}>
              <Text style={[s.adviceText, { color: result.isProfit ? '#1B8A4E' : '#E65100' }]}>
                {result.isProfit
                  ? result.roi >= 10
                    ? `💰 투자수익률 ${result.roi.toFixed(1)}% — 우수한 수익률입니다. 적극 출하를 권장합니다.`
                    : `✅ 수익이 발생하나 마진이 낮습니다. 비용 절감을 검토하세요.`
                  : `⚠️ 현재 조건으로는 손실입니다. 판매가를 ${fmt(Math.round(result.breakEvenPerKg))}/kg 이상으로 유지하거나 비용을 줄이세요.`
                }
              </Text>
            </View>

            <TouchableOpacity style={s.resetBtn} onPress={resetProfit}>
              <Text style={s.resetBtnText}>🔄 초기화</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.emptyHint}>
            <Text style={s.emptyHintText}>매입가, 박스 수, 박스 규격을 입력하면{'\n'}손익이 자동 계산됩니다</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  section:       { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  toggleBtn:     { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },

  // 카테고리
  catRow:        { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  catChip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.background },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText:   { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  catChipTextActive: { color: '#fff' },

  // 품목
  itemSelector:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  itemSelectorText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  itemSelectorArrow:{ fontSize: 12, color: COLORS.textDisabled },
  itemGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  itemChip:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.background },
  itemChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemChipText:  { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  itemChipTextActive: { color: '#fff' },
  marketPriceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 10, backgroundColor: '#E8F5E9', borderRadius: 8 },
  marketPriceLabel: { fontSize: 12, color: COLORS.textSecondary },
  marketPriceValue: { fontSize: 14, fontWeight: '800', color: '#1B8A4E' },

  // 입력
  input:         { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.divider },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive:{ color: '#fff' },
  subResultRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, padding: 10, backgroundColor: COLORS.background, borderRadius: 8 },
  subResultLabel:{ fontSize: 11, color: COLORS.textDisabled },
  subResultValue:{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },

  // 결과 카드
  resultCard:    { margin: 14, borderRadius: 16, borderWidth: 2, backgroundColor: COLORS.surface, padding: 16 },
  resultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultTitle:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  resultBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  resultBadgeText:{ fontSize: 12, fontWeight: '800' },

  kpiRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiBox:  { flex: 1, alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, padding: 12 },
  kpiLabel:{ fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 5 },
  kpiValue:{ fontSize: 16, fontWeight: '900' },

  detailTable: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginBottom: 14 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, color: COLORS.textSecondary },

  breakEvenBox:  { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  breakEvenLabel:{ fontSize: 11, color: COLORS.textDisabled },
  breakEvenValue:{ fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginVertical: 4 },
  breakEvenSub:  { fontSize: 12, color: COLORS.textSecondary },

  adviceBox:  { borderRadius: 10, padding: 12, marginBottom: 12 },
  adviceText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },

  resetBtn:     { borderRadius: 10, borderWidth: 1, borderColor: COLORS.divider, padding: 12, alignItems: 'center' },
  resetBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  emptyHint:    { margin: 14, padding: 24, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14 },
  emptyHintText:{ fontSize: 14, color: COLORS.textDisabled, textAlign: 'center', lineHeight: 22 },
});
