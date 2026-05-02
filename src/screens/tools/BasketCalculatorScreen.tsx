import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { COLORS, CATEGORIES } from '@/constants';
import { MOCK_PRICES } from '@/services/mockData';
import { getRetailPrice } from '@/utils/userTypeUtils';
import { useSavingsStore } from '@/store/savingsStore';
import { useBasketStore, type BasketItem } from '@/store/calculatorStore';

// ── 숫자 포맷 헬퍼 ───────────────────────────────────────────
function fmtPrice(n: number) { return n.toLocaleString('ko-KR') + '원'; }

// ── 카테고리 목록 (전체 포함) ─────────────────────────────────
const CAT_ALL = [{ code: '', name: '전체', emoji: '📋' }, ...CATEGORIES];

export default function BasketCalculatorScreen() {
  const { addRecord } = useSavingsStore();
  const { basket, setBasket } = useBasketStore();

  const [search, setSearch]         = useState('');
  const [selectedCat, setSelectedCat] = useState('');   // 1차 카테고리

  // ── 2단계 품목 목록 ──
  const displayItems = useMemo(() => {
    if (search.trim()) {
      return MOCK_PRICES.filter((p) => p.itemName.includes(search.trim())).slice(0, 12);
    }
    return selectedCat
      ? MOCK_PRICES.filter((p) => p.category === selectedCat)
      : MOCK_PRICES;
  }, [search, selectedCat]);

  // ── 추가 ──
  const addItem = (p: (typeof MOCK_PRICES)[0]) => {
    setSearch('');
    if (basket.find((b) => b.itemCode === p.itemCode)) {
      Alert.alert('', `${p.itemName}은 이미 담겨 있어요.`);
      return;
    }
    setBasket([
      ...basket,
      {
        itemCode: p.itemCode,
        itemName: p.itemName,
        qty: 1,
        price: getRetailPrice(p.avgPrice, p.category),
        prevPrice: getRetailPrice(p.prevPrice, p.category),
        category: p.category,
      },
    ]);
  };

  const updateQty = (itemCode: string, qty: number) => {
    if (qty <= 0) {
      setBasket(basket.filter((b) => b.itemCode !== itemCode));
      return;
    }
    setBasket(basket.map((b) => (b.itemCode === itemCode ? { ...b, qty } : b)));
  };

  const totalNow  = useMemo(() => basket.reduce((s, b) => s + b.price * b.qty, 0), [basket]);
  const totalPrev = useMemo(() => basket.reduce((s, b) => s + b.prevPrice * b.qty, 0), [basket]);
  const saved     = totalPrev - totalNow;

  const handleSave = () => {
    if (basket.length === 0) return;
    if (saved <= 0) {
      Alert.alert('절약 기록', '지난주보다 가격이 비쌉니다. 기록하지 않습니다.');
      return;
    }
    addRecord(`장바구니 (${basket.map((b) => b.itemName).join(', ')})`, saved);
    Alert.alert('✅ 저장됨', `${fmtPrice(saved)} 절약이 기록됐습니다.`);
  };

  const isInBasket = (code: string) => !!basket.find((b) => b.itemCode === code);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* ── 1단계: 카테고리 선택 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>① 카테고리 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.catRow}>
              {CAT_ALL.map((cat) => (
                <TouchableOpacity
                  key={cat.code}
                  style={[styles.catChip, selectedCat === cat.code && styles.catChipActive]}
                  onPress={() => { setSelectedCat(cat.code); setSearch(''); }}
                >
                  <Text style={[styles.catChipText, selectedCat === cat.code && styles.catChipTextActive]}>
                    {cat.emoji} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── 2단계: 품목 검색 + 목록 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>② 품목 추가</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="품목명 검색..."
            placeholderTextColor={COLORS.textDisabled}
            value={search}
            onChangeText={setSearch}
          />

          <View style={styles.itemGrid}>
            {displayItems.map((p) => {
              const added = isInBasket(p.itemCode);
              return (
                <TouchableOpacity
                  key={p.itemCode}
                  style={[styles.itemChip, added && styles.itemChipActive]}
                  onPress={() => added ? updateQty(p.itemCode, 0) : addItem(p)}
                >
                  <Text style={[styles.itemChipName, added && styles.itemChipNameActive]}>
                    {added ? '✓ ' : ''}{p.itemName}
                  </Text>
                  <Text style={[styles.itemChipPrice, added && { color: '#fff' }]}>
                    {fmtPrice(getRetailPrice(p.avgPrice, p.category))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {displayItems.length === 0 && (
            <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
          )}
        </View>

        {/* ── 장바구니 목록 ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛒 내 장바구니 ({basket.length}개)</Text>
            {basket.length > 0 && (
              <TouchableOpacity onPress={() => setBasket([])}>
                <Text style={styles.clearBtn}>전체 삭제</Text>
              </TouchableOpacity>
            )}
          </View>

          {basket.length === 0 ? (
            <Text style={styles.emptyText}>위에서 품목을 선택하세요</Text>
          ) : (
            basket.map((item) => {
              const itemTotal = item.price * item.qty;
              const prevTotal = item.prevPrice * item.qty;
              const diff      = prevTotal - itemTotal;
              return (
                <View key={item.itemCode} style={styles.basketRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.basketName}>{item.itemName}</Text>
                    <Text style={styles.basketUnit}>{fmtPrice(item.price)} / kg</Text>
                    {diff !== 0 && (
                      <Text style={[styles.basketDiff, { color: diff > 0 ? COLORS.dropStrong : COLORS.surgeStrong }]}>
                        {diff > 0
                          ? `지난주보다 ${fmtPrice(Math.abs(diff))} 저렴`
                          : `지난주보다 ${fmtPrice(Math.abs(diff))} 비쌈`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.itemCode, item.qty - 1)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.itemCode, item.qty + 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.basketTotal}>{fmtPrice(itemTotal)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* ── 합계 ── */}
        {basket.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>이번 주 합계</Text>
              <Text style={styles.summaryAmount}>{fmtPrice(totalNow)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>지난주 같은 장바구니</Text>
              <Text style={styles.summaryPrev}>{fmtPrice(totalPrev)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryDivider]}>
              <Text style={styles.summaryLabel}>절약 / 추가 지출</Text>
              <Text style={[styles.summaryDiff, { color: saved >= 0 ? COLORS.dropStrong : COLORS.surgeStrong }]}>
                {saved >= 0 ? `−${fmtPrice(saved)} 절약` : `+${fmtPrice(Math.abs(saved))} 추가`}
              </Text>
            </View>
            {saved > 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>💾 절약 기록에 저장</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  section:      { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  clearBtn:     { fontSize: 12, color: COLORS.surgeStrong, fontWeight: '600' },

  // 카테고리
  catRow:       { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  catChip:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.background },
  catChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText:  { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  catChipTextActive: { color: '#fff' },

  // 품목 그리드
  searchInput:  { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.divider, marginBottom: 10 },
  itemGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemChip:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.background, alignItems: 'center' },
  itemChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemChipName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  itemChipNameActive: { color: '#fff' },
  itemChipPrice:{ fontSize: 10, color: COLORS.textDisabled, marginTop: 1 },
  emptyText:    { fontSize: 13, color: COLORS.textDisabled, textAlign: 'center', paddingVertical: 16 },

  // 장바구니
  basketRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  basketName:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  basketUnit:   { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },
  basketDiff:   { fontSize: 11, fontWeight: '600', marginTop: 2 },
  basketTotal:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, width: 76, textAlign: 'right' },
  qtyControl:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn:       { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:   { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 20 },
  qtyValue:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },

  // 합계
  summaryCard:    { backgroundColor: COLORS.surface, margin: 14, borderRadius: 14, padding: 16 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel:   { fontSize: 13, color: COLORS.textSecondary },
  summaryAmount:  { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  summaryPrev:    { fontSize: 13, color: COLORS.textDisabled, textDecorationLine: 'line-through' },
  summaryDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10, marginTop: 4 },
  summaryDiff:    { fontSize: 16, fontWeight: '800' },
  saveBtn:        { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontSize: 14, fontWeight: '800' },
});
